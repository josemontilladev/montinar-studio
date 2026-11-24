# Publicar en YouTube y LinkedIn: lo verificado en la documentación oficial

Consultado el **24 de noviembre de 2026**. Entre paréntesis va la fecha de actualización que muestra cada página
(`updated_at` en learn.microsoft.com). Las páginas de Google no muestran fecha: como referencia de vigencia se usa el
[historial de revisiones de la YouTube Data API](https://developers.google.com/youtube/v3/revision_history), cuya entrada más reciente es del 16/11/2026.
Lo que **no** se pudo confirmar en una página oficial está marcado con ⚠.

El código está en `electron/publicar/` (proceso principal) y `app/publicar/` (interfaz). Este documento explica las decisiones.

## YouTube Data API v3

### Subir y programar (`videos.insert`)

[Referencia de videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert) ·
[Subida reanudable](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol) ·
[Recurso video](https://developers.google.com/youtube/v3/docs/videos)

**Cómo se sube**

- Se abre una sesión con `POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`.
  - Cabeceras: `X-Upload-Content-Length` y `X-Upload-Content-Type`.
  - La respuesta es `200` y trae la URI de la sesión en `Location`.
- Se envía el archivo con `PUT` a esa URI.
  - Cada parte que no es la última recibe `308` y una cabecera `Range` (indexada desde 0).
  - La parte final recibe `201`.
- Para saber cuánto llegó: `PUT` vacío con `Content-Range: bytes */TOTAL`.
- Qué hacer ante cada fallo:
  - 5xx: reintentar con espera exponencial.
  - 404: la sesión caducó y hay que empezar de nuevo.
- La app sube en partes de 8 MiB (múltiplo de 256 KiB). Tras un corte, consulta cuánto llegó y sigue desde ahí.

**Límites**

- Archivo: hasta 256 GB. MIME `video/*` o `application/octet-stream`.
- `snippet.title`: 100 caracteres como máximo, sin `<` ni `>`.
- `snippet.description`: 5000 bytes como máximo, sin `<` ni `>`.
- `snippet.tags`: 500 caracteres en total.

**Programar**

- `status.publishAt` (ISO 8601) solo se admite si `privacyStatus` es `private` y el vídeo no se ha publicado nunca.
- Si la fecha ya pasó, el vídeo se publica en el acto.
- La app programa solo si faltan 15 minutos o más. Si no, pide confirmación y sube como público.

**Otros campos que usa la app**

- `status.selfDeclaredMadeForKids` existe; la app lo envía siempre `false` («no es para niños»).
- `status.containsSyntheticMedia` existe; la app lo envía `false` salvo que se marque en Ajustes.
- `snippet.categoryId`, `defaultLanguage` y `defaultAudioLanguage` van con `es`.

**Errores que la app reconoce**

| Error | Significado |
|---|---|
| `403 quotaExceeded` | Cuota agotada. |
| `400 uploadLimitExceeded` | Límite diario de subidas del canal (de la plataforma, no de la cuota). |
| `invalidPublishAt`, `invalidTitle`, `invalidDescription`, `invalidTags` | Datos no válidos. Fuente: [Errores](https://developers.google.com/youtube/v3/docs/errors). |

### Miniatura, subtítulos y listas

- **`thumbnails.set`** ([referencia](https://developers.google.com/youtube/v3/docs/thumbnails/set)):
  - `POST https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=…`
  - Hasta **50 MB**; el límite subió de 2 MB el 14/09/2026. Formatos JPEG o PNG.
  - `403 forbidden` si la cuenta no puede poner miniaturas personalizadas.
  - El canal tiene que estar verificado ([ayuda](https://support.google.com/youtube/answer/72431)).
  - Desde el 03/11/2026 también se admiten en Shorts.
- **`captions.insert`** ([referencia](https://developers.google.com/youtube/v3/docs/captions/insert)):
  - Subida multipart con `snippet.videoId`, `language` y `name`.
  - Hasta 100 MB. Admite .srt ([formatos](https://support.google.com/youtube/answer/2734698)).
  - `409 captionExists` si ya existe la pista; la app lo trata como hecho.
  - Scopes: **solo `youtube.force-ssl` o `youtubepartner`**.
- **`playlists.list`** con `mine=true` y **`playlistItems.insert`** ([referencia](https://developers.google.com/youtube/v3/docs/playlistItems/insert)):
  - La app busca la lista por nombre exacto (sin distinguir mayúsculas). Si no existe, avisa y no la crea.
  - ⚠ La lista de scopes de `playlists.list` no se pudo leer en su página. `youtube.force-ssl` sirve en la práctica.

### Cuota

Fuentes: [Getting started](https://developers.google.com/youtube/v3/getting-started),
[Costes de cuota](https://developers.google.com/youtube/v3/determine_quota_cost) e historial de revisiones (entradas del 04/12/2025 y del 01/06/2026).

**Asignación por defecto**

- Desde el 01/06/2026, `videos.insert` tiene su propio cupo: **100 subidas al día**, a 1 unidad cada una.
- El resto de llamadas comparten **10.000 unidades al día**.
- La cuota se reinicia a **medianoche hora del Pacífico**.

**Coste de cada llamada (unidades)**

| Llamada | Coste |
|---|---|
| `thumbnails.set` | 50 |
| `captions.insert` | 400 |
| `playlistItems.insert` | 50 |
| `playlists.list` | 1 |
| `channels.list` | 1 |

Una publicación completa gasta unas 500 unidades del cupo general.

**Más cuota:** se pide con el [formulario de auditoría y ampliación de cuota](https://support.google.com/youtube/contact/yt_api_form). Toda ampliación pasa por una auditoría de cumplimiento.

### Restricción a «privado» de los proyectos no auditados: **retirada**

- **Antes:** desde el 28/07/2020, los vídeos subidos con la API desde proyectos no verificados quedaban bloqueados en privado.
- **Ahora:** el [historial de revisiones](https://developers.google.com/youtube/v3/revision_history), en su entrada del **02/11/2026**, dice: *«Videos uploaded through the videos.insert method from unverified API projects are no longer restricted to private viewing mode»*. La página de `videos.insert` lo repite.
- **Fuentes que no coinciden:** la [ayuda de YouTube](https://support.google.com/youtube/answer/7300965) aún conserva el texto antiguo.
- **Qué hace la app:** comprueba el estado que devuelve la subida. Si el vídeo queda en privado sin `publishAt` (o en privado cuando se pidió público), lo avisa en la interfaz. Explica entonces la regla antigua, que conviene revisar YouTube Studio y que, si hace falta, se puede pedir la auditoría con el formulario anterior.
- ⚠ Ningún texto oficial actual habla de un bloqueo específico de los vídeos programados.

### OAuth para la app de escritorio

Fuentes: [OAuth para apps nativas](https://developers.google.com/identity/protocols/oauth2/native-app) y
[apps instaladas en YouTube](https://developers.google.com/youtube/v3/guides/auth/installed-apps).

**Flujo**

- La redirección es **loopback** (`http://127.0.0.1:PUERTO`) con un puerto libre al azar. Los esquemas propios y el flujo de copiar y pegar el código (OOB) ya no se admiten.
- Se usa **PKCE** siempre («Always use PKCE»), con S256 y un verifier de 43 a 128 caracteres.
- El `state` protege contra CSRF.
- El intercambio va a `https://oauth2.googleapis.com/token` con `code_verifier`.
  - El `client_secret` es opcional porque las apps de escritorio son clientes públicos. La app lo envía igualmente.
- Las apps instaladas siempre reciben `refresh_token`.
  - ⚠ `access_type=offline` no figura en esa guía. La app lo envía, junto con `prompt=consent`, para asegurar el refresh token al reconectar.

**Scope:** la app pide solo `https://www.googleapis.com/auth/youtube.force-ssl`.

| Método | Scopes que acepta |
|---|---|
| `videos.insert` | youtube.upload, youtube, youtube.force-ssl, youtubepartner |
| `thumbnails.set` | youtube.upload, youtube, youtube.force-ssl, youtubepartner |
| `captions.insert` | **solo** youtube.force-ssl, youtubepartner |
| `playlistItems.insert` | youtube, youtube.force-ssl, youtubepartner |

`youtube.upload` no basta para subtítulos ni listas, así que el único scope que cubre todo es `youtube.force-ssl`. ⚠ Su clasificación oficial (sensible o restringido) no se pudo leer. La consola la muestra al añadirlo.

**Caducidad**

- Con la app en estado **«Prueba»** y audiencia externa, el refresh token **caduca a los 7 días**. Fuentes: [OAuth 2.0](https://developers.google.com/identity/protocols/oauth2) y [Audiencia](https://support.google.com/cloud/answer/15549945).
- Se evita pasando la app a «En producción».
- La verificación de scopes sensibles no hace falta cuando la app la usan pocas personas, todas conocidas por el desarrollador ([verificación](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)).

**Consola**

- Los menús actuales son Google Auth Platform › Audiencia (usuarios de prueba) › Acceso a datos › **Clientes** › Crear cliente › **App de escritorio** ([ayuda](https://support.google.com/cloud/answer/15549257)).
- El secreto de cliente **solo se ve entero al crearlo**.

## LinkedIn (perfil personal)

### Productos y permisos

[Getting access](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access) (actualizada el 03/06/2026).

- Hay dos productos de **autoservicio** para cualquier app:
  - «**Share on LinkedIn**» da el scope `w_member_social`.
  - «**Sign In with LinkedIn using OpenID Connect**» da `openid`, `profile` y `email` ([OIDC](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2), 08/08/2024).
- La app pide `openid profile w_member_social`.
- **LinkedIn Page:** el formulario para crear la app pide asociarla a una Página de LinkedIn; si no hay, el formulario permite crearla. La verifica un super admin ([ayuda](https://www.linkedin.com/help/lms/answer/a548360)).
  - ⚠ No consta que la verificación sea obligatoria para estos dos productos, pero la app lo indica como paso.

### OAuth

[Flujo de autorización](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow) (15/05/2026).

**Petición y canje**

- La autorización va a `https://www.linkedin.com/oauth/v2/authorization` con `state`.
- El canje va a `/oauth/v2/accessToken` y **exige `client_secret`**.

**URL de redirección**

- Tiene que coincidir con una de las registradas en la pestaña Auth; la query se ignora al comparar.
- El ejemplo oficial registra `http://localhost:8080/login` ([samples](https://learn.microsoft.com/en-us/linkedin/shared/authentication/sample-applications)).
- La app usa la URL fija `http://127.0.0.1:53682/linkedin`, con el puerto ajustable, que hay que registrar tal cual.
- ⚠ Ninguna página dice expresamente que se acepte `127.0.0.1` en el flujo estándar. Si LinkedIn la rechazara, se puede registrar `localhost` (habría que cambiarlo en `oauth.cjs`).

**PKCE**

- LinkedIn solo admite PKCE en el [flujo «native»](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow-native), que su equipo activa a mano para cada app.
- Por eso con LinkedIn no se usa PKCE. La protección queda en el `state` y en el servidor local, que solo escucha en 127.0.0.1.

**Tokens**

- El token dura **60 días**.
- Los refresh tokens programáticos son solo para socios aprobados ([refresh](https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens), 08/10/2025).
- Así que la app avisa cuando faltan menos de 10 días y hay que reconectar. Si el usuario sigue con sesión en linkedin.com, es un clic.

**Identidad del autor**

- Se obtiene con `GET https://api.linkedin.com/v2/userinfo`, que devuelve `sub`.
- El autor es `urn:li:person:{sub}`. ⚠ Esta forma se deduce de la documentación de Share on LinkedIn; ninguna página la escribe literalmente.

### Posts API y subidas

[Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api) (13/05/2026) ·
[Versionado](https://learn.microsoft.com/en-us/linkedin/marketing/versioning) (16/11/2026).

**Cabeceras y versión**

- Toda llamada lleva `LinkedIn-Version: AAAAMM` y `X-Restli-Protocol-Version: 2.0.0`.
- La versión más reciente es **202611**. Cada versión se mantiene al menos un año.
- La app usa `202611` y la versión se puede cambiar en Ajustes.

**Crear el post**

- `POST https://api.linkedin.com/rest/posts` con `author`, `commentary`, `visibility: PUBLIC`, `distribution.feedDistribution: MAIN_FEED`, `lifecycleState: PUBLISHED` y, si lleva imagen, vídeo o documento, `content.media`.
- Para un documento, `media.title` es obligatorio.
- La respuesta es `201`, con el id del post en la cabecera `x-restli-id`.

**Texto** ([little text format](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/little-text-format), 16/10/2025)

- Todos los caracteres reservados `| { } @ [ ] ( ) < > # \ * _ ~` se escapan con `\`.
- La excepción es el `#` de un hashtag (`#palabra`), que LinkedIn convierte en hashtag.
- ⚠ No hay cifra oficial de longitud máxima. La interfaz avisa a partir de 3000 caracteres.

**Imagen** ([Images API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api), 24/06/2026)

- `POST /rest/images?action=initializeUpload` y después `PUT` del archivo a `uploadUrl`, con el token.
- Formatos JPG, GIF o PNG, por debajo de 36.152.320 píxeles.

**Vídeo** ([Videos API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api), 02/03/2026)

1. `initializeUpload` con `fileSizeBytes`.
2. `PUT` de cada parte (4 MB) a su `uploadUrl`, **sin token**, guardando el `ETag`.
3. `finalizeUpload` con los ETags en el mismo orden.

Límites: de 3 s a 30 min, de 75 KB a 500 MB, MP4. ⚠ La misma página también dice 5 GB para `fileSizeBytes`; la app usa 500 MB.

Los subtítulos de LinkedIn solo admiten inglés, así que no se suben los .srt en español.

**Documento** ([Documents API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/documents-api), 24/06/2026)

- `initializeUpload` y después `PUT` con el token.
- Formatos PDF, PPT(X) o DOC(X); hasta 100 MB y 300 páginas.
- `w_member_social` figura entre sus permisos. ⚠ No se ha probado con una app que solo tenga Share on LinkedIn.

**Primer comentario** ([Comments API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/comments-api), 30/04/2026)

- `POST /rest/socialActions/{urn}/comments`.
- ⚠ Su tabla de permisos cita `w_member_social_feed`, mientras que otras páginas describen `w_member_social` como «post, comment and like». La app lo intenta y, si falla, el post queda publicado y avisa para ponerlo a mano.

**Límites de uso**

- La página de Share on LinkedIn publica 150 peticiones por miembro y día y 100.000 por app y día (reinicio a medianoche UTC). El exceso devuelve 429.
- Fuentes: [Share on LinkedIn](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin) (14/12/2023) y [rate limits](https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits) (20/08/2025).

**Sin programación nativa**

- El esquema dice: *«PUBLISHED is the only accepted field during creation»* ([Post schema](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/post-api-schema), 30/04/2026).
- Por eso la app publica **a la hora, desde una cola local**, y necesita estar abierta.

### Publicar como Página de empresa (no implementado)

Hace falta la **Community Management API** (`w_organization_social`; el autor sería `urn:li:organization:{id}`).

**Requisitos de acceso**

- Tiene que ser el **único producto** de su app. La app actual (Share on LinkedIn + OIDC) no puede pedirlo, así que haría falta una app nueva ([guía de socios](https://learn.microsoft.com/en-us/linkedin/shared/linkedin-api-partner-support-guide), 03/06/2026).
- Solo se concede a organizaciones registradas y para uso comercial.
- Pide correo de empresa verificado (no personal), razón social, web y política de privacidad.
- Un super admin de la Página tiene que verificar la app ([revisión](https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review), 11/02/2026).

**Niveles de acceso** ([increasing access](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access), 19/10/2026)

- **Development:** 500 llamadas por app y 100 por miembro cada 24 h.
- **Standard:** requiere formulario y un vídeo de demostración del flujo completo.

## Lo que hace la app con esto

| | YouTube | LinkedIn |
|---|---|---|
| Conexión | Navegador del sistema, 127.0.0.1 con puerto libre, PKCE S256 y state | Navegador del sistema, 127.0.0.1:53682/linkedin registrada, state |
| Permiso | `youtube.force-ssl` (refresh automático) | `openid profile w_member_social` (60 días, se reconecta) |
| Programar | En YouTube (`publishAt`); no necesita la app abierta | Cola local; publica a la hora **con la app abierta** |
| Envía | Vídeo, título, descripción con UTM y hashtags, etiquetas, categoría, «no es para niños», miniatura, .srt en español, lista si existe | Texto con hashtags, imagen / vídeo / carrusel como PDF (printToPDF) y primer comentario |

Las credenciales y los tokens se guardan cifrados con `safeStorage` (DPAPI) en `%APPDATA%\MetricaSEO Studio\publicar\secretos.bin`.
Nunca van a la carpeta sincronizada, al repositorio ni a los registros.
