/**
 * Ajustes › Redes: credenciales de las apps (Google Cloud y LinkedIn Developers), conectar/desconectar cuentas con
 * OAuth en el navegador, instrucciones paso a paso y ajustes de publicación (zonas, categoría, listas, LinkedIn).
 * Las credenciales viajan solo al proceso principal, que las guarda cifradas (safeStorage) en este equipo.
 */
import { useState } from 'react';
import { Check, Copy, ExternalLink, LoaderCircle, PlugZap, TriangleAlert, Unplug } from 'lucide-react';
import { abrirUrl, fechaHora, op, zonaCorta, type Ajustes, type Estado, type Red } from './api';

const ZONAS = ['America/Bogota', 'America/Caracas', 'America/Lima', 'America/Mexico_City', 'America/Santo_Domingo', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'Europe/Madrid'];
const CATEGORIAS: Record<string, string> = { '28': 'Ciencia y tecnología', '27': 'Educación', '22': 'Personas y blogs', '26': 'Consejos y estilo' };

type Props = { est: Estado; recargar: () => void; avisar: (t: string, tipo?: 'ok' | 'error') => void };

function Enlace({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <button type="button" className="link inline-flex items-center gap-0.5" onClick={() => abrirUrl(url)}>
      {children}
      <ExternalLink className="size-3" />
    </button>
  );
}

export function Redes({ est, recargar, avisar }: Props) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {!est.cifrado && (
          <div role="alert" className="alert alert-error text-sm">
            <TriangleAlert className="size-4" /> El cifrado del sistema no está disponible: no se pueden guardar credenciales en este equipo.
          </div>
        )}
        <p className="text-sm text-suave">
          Las credenciales y los permisos se guardan <b>cifrados solo en este equipo</b> (datos de la app, con el cifrado de Windows), nunca en la carpeta sincronizada. En el otro equipo hay que conectarlas también.
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <TarjetaRed red="youtube" est={est} recargar={recargar} avisar={avisar} />
          <TarjetaRed red="linkedin" est={est} recargar={recargar} avisar={avisar} />
        </div>
        <AjustesPublicar est={est} recargar={recargar} avisar={avisar} />
      </div>
    </div>
  );
}

function TarjetaRed({ red, est, recargar, avisar }: { red: Red } & Props) {
  const c = est.cuentas[red];
  const [id, setId] = useState('');
  const [secreto, setSecreto] = useState('');
  const [conectando, setConectando] = useState(false);
  const nombre = red === 'youtube' ? 'YouTube' : 'LinkedIn';

  const guardar = async () => {
    try {
      await op('guardar-credenciales', { red, clientId: id || undefined, clientSecret: secreto });
      setId('');
      setSecreto('');
      avisar('Credenciales guardadas (cifradas)');
    } catch (e: any) {
      avisar(e.message, 'error');
    }
    recargar();
  };
  const conectar = async () => {
    setConectando(true);
    try {
      const r = await op<{ cuenta: { nombre?: string } }>('conectar', { red });
      avisar(`${nombre} conectado${r.cuenta?.nombre ? `: ${r.cuenta.nombre}` : ''}`);
    } catch (e: any) {
      avisar(e.message, 'error');
    } finally {
      setConectando(false);
      recargar();
    }
  };
  const simple = (nombreOp: string, ok: string, pregunta?: string) => async () => {
    if (pregunta && !window.confirm(pregunta)) return;
    try {
      await op(nombreOp, { red });
      avisar(ok);
    } catch (e: any) {
      avisar(e.message, 'error');
    }
    recargar();
  };
  const dias = c.expira ? Math.floor((c.expira - Date.now()) / 864e5) : null;

  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-5" data-red={red}>
      <header className="mb-3 flex items-center gap-2">
        <i className="inline-block size-2.5 rounded-full" style={{ background: red === 'youtube' ? '#e62117' : '#0a66c2' }} />
        <h2 className="font-semibold">{nombre}</h2>
        <span className={`badge badge-sm ml-auto ${c.conectada ? 'badge-success' : c.credenciales ? 'badge-warning' : 'badge-ghost'}`} data-estado-red>
          {c.conectada ? 'Conectada' : c.credenciales ? 'Sin conectar' : 'Sin configurar'}
        </span>
      </header>
      {c.conectada && (
        <p className="mb-3 text-sm">
          <Check className="mr-1 inline size-4 text-success" />
          {c.cuenta?.nombre ?? 'Cuenta conectada'} {c.cuenta?.handle && <span className="text-suave">({c.cuenta.handle})</span>}
          {red === 'linkedin' && dias != null && <span className={dias < 10 ? 'text-warning' : 'text-suave'}> · el permiso caduca en {Math.max(0, dias)} días</span>}
        </p>
      )}

      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">ID de cliente {c.clientIdFinal && <span className="font-normal text-tenue">(guardado: {c.clientIdFinal})</span>}</span>
          <input className="input input-sm w-full" value={id} onChange={(e) => setId(e.target.value)} placeholder={c.clientIdFinal ? 'Déjalo vacío para mantener el guardado' : red === 'youtube' ? '123…apps.googleusercontent.com' : '78abc…'} autoComplete="off" spellCheck={false} data-campo="client-id" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">Secreto de cliente</span>
          <input className="input input-sm w-full" type="password" value={secreto} onChange={(e) => setSecreto(e.target.value)} placeholder={c.credenciales ? '•••••••• (guardado)' : ''} autoComplete="off" data-campo="client-secret" />
        </label>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" className="btn btn-sm" disabled={!est.cifrado || (!id && !secreto)} onClick={guardar} data-accion="guardar-credenciales">
            Guardar credenciales
          </button>
          {conectando ? (
            <button type="button" className="btn btn-sm gap-1.5" onClick={simple('cancelar-conexion', 'Conexión cancelada')}>
              <LoaderCircle className="size-4 animate-spin" /> Esperando al navegador… (cancelar)
            </button>
          ) : (
            <button type="button" className="btn btn-sm btn-primary gap-1.5" disabled={!c.credenciales} onClick={conectar} data-accion="conectar">
              <PlugZap className="size-4" /> {c.conectada ? 'Reconectar' : `Conectar ${nombre}`}
            </button>
          )}
          {c.conectada && (
            <button type="button" className="btn btn-ghost btn-sm gap-1.5" onClick={simple('desconectar', `${nombre} desconectado`, `¿Desconectar ${nombre}? Se olvida el permiso en este equipo.`)}>
              <Unplug className="size-4" /> Desconectar
            </button>
          )}
          {c.credenciales && (
            <button type="button" className="btn btn-ghost btn-sm text-error" onClick={simple('borrar-credenciales', 'Credenciales borradas', `¿Borrar las credenciales de ${nombre} de este equipo?`)}>
              Borrar credenciales
            </button>
          )}
        </div>
      </div>

      <details className="mt-4 text-sm" open={!c.credenciales}>
        <summary className="cursor-pointer font-semibold">Cómo crear las credenciales (paso a paso)</summary>
        {red === 'youtube' ? <PasosGoogle /> : <PasosLinkedIn redirect={est.redireccionLinkedIn} avisar={avisar} />}
      </details>
    </section>
  );
}

function PasosGoogle() {
  return (
    <div className="mt-2 space-y-3 text-[0.82rem] leading-relaxed">
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>
          Entra en <Enlace url="https://console.cloud.google.com/projectcreate">Google Cloud Console</Enlace> con la cuenta de Google dueña del canal <b>@metricaseo_site</b> y crea un proyecto (p. ej. «MetricaSEO Studio»).
        </li>
        <li>
          <Enlace url="https://console.cloud.google.com/apis/library/youtube.googleapis.com">APIs y servicios › Biblioteca › YouTube Data API v3</Enlace> › <b>Habilitar</b>.
        </li>
        <li>
          <Enlace url="https://console.cloud.google.com/auth/overview">Google Auth Platform</Enlace> › <b>Empezar</b>: nombre de la app, tu correo de asistencia, audiencia <b>Externa</b>, correo de contacto › Crear.
        </li>
        <li>
          <Enlace url="https://console.cloud.google.com/auth/audience">Audiencia</Enlace> › <b>Usuarios de prueba</b> › añade la cuenta de Google del canal.
        </li>
        <li>
          <Enlace url="https://console.cloud.google.com/auth/scopes">Acceso a datos</Enlace> › Añadir permisos: <code>…/auth/youtube.force-ssl</code> (subir, miniatura, subtítulos y listas; es el único que pide la app).
        </li>
        <li>
          <Enlace url="https://console.cloud.google.com/auth/clients">Clientes</Enlace> › <b>Crear cliente</b> › tipo <b>App de escritorio</b> › Crear. Copia el <b>ID de cliente</b> y el <b>secreto</b> (el secreto solo se ve entero al crearlo: descarga el JSON). No hace falta URL de redirección: la app usa 127.0.0.1 con un puerto libre.
        </li>
        <li>
          Pégalos arriba › <b>Guardar credenciales</b> › <b>Conectar YouTube</b>. Se abre tu navegador: elige la cuenta del canal y acepta (si avisa de que la app no está verificada: «Configuración avanzada» › «Ir a…», es tu propia app).
        </li>
      </ol>
      <div className="rounded-lg bg-panel3 p-3 text-xs">
        <p>
          <b>Permiso de 7 días:</b> mientras la app de Google Cloud esté en «Prueba», el permiso caduca a los 7 días y hay que reconectar. Para evitarlo: Audiencia › <b>Publicar app</b> (En producción). Para tu uso personal no hace falta la verificación de Google.
        </p>
        <p className="mt-1.5">
          <b>Cuota:</b> 100 subidas al día y 10.000 unidades para lo demás (miniatura ≈ 50, subtítulos 400, lista 50). Se reinicia a medianoche hora del Pacífico. Más cuota: <Enlace url="https://support.google.com/youtube/contact/yt_api_form">formulario de auditoría y ampliación</Enlace>.
        </p>
        <p className="mt-1.5">
          <b>Vídeos en privado:</b> hasta noviembre de 2026, los vídeos subidos desde proyectos de API no auditados quedaban bloqueados en privado. Google retiró esa regla el 2/11/2026 (<Enlace url="https://developers.google.com/youtube/v3/revision_history">historial de la API</Enlace>). Si aun así un vídeo queda en privado, la app lo avisa: revisa YouTube Studio y, si hace falta, pide la auditoría con el formulario anterior.
        </p>
        <p className="mt-1.5">
          <b>Miniaturas personalizadas:</b> el canal debe estar verificado por teléfono (<Enlace url="https://www.youtube.com/verify">youtube.com/verify</Enlace>).
        </p>
      </div>
    </div>
  );
}

function PasosLinkedIn({ redirect, avisar }: { redirect: string; avisar: Props['avisar'] }) {
  return (
    <div className="mt-2 space-y-3 text-[0.82rem] leading-relaxed">
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>
          <Enlace url="https://www.linkedin.com/developers/apps/new">LinkedIn Developers › Create app</Enlace>: nombre (p. ej. «MetricaSEO Studio»), logo y política de privacidad.
        </li>
        <li>
          <b>LinkedIn Page:</b> LinkedIn exige vincular la app a una Página. La Página de empresa de MétricaSEO aún no existe: créala desde el mismo formulario («Create a new LinkedIn Page») o antes en LinkedIn. Las publicaciones irán igualmente a <b>tu perfil personal</b>.
        </li>
        <li>
          En la app › <b>Settings</b> › <b>Verify</b>: abre el enlace con tu cuenta (eres super admin de la Página) y aprueba.
        </li>
        <li>
          <b>Products</b> › «<b>Share on LinkedIn</b>» y «<b>Sign In with LinkedIn using OpenID Connect</b>» › Request access (son de autoservicio).
        </li>
        <li>
          <b>Auth</b> › OAuth 2.0 settings › <b>Authorized redirect URLs</b> › añade exactamente:
          <span className="mt-1 flex items-center gap-1.5">
            <code className="rounded bg-panel3 px-1.5 py-0.5" data-redireccion>
              {redirect}
            </code>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => navigator.clipboard.writeText(redirect).then(() => avisar('URL copiada'))}>
              <Copy className="size-3" />
            </button>
          </span>
          <span className="text-xs text-suave">(si cambias el puerto abajo, cambia también esta URL en LinkedIn).</span>
        </li>
        <li>
          <b>Auth</b> › Application credentials: copia <b>Client ID</b> y <b>Primary Client Secret</b>, pégalos arriba › Guardar › <b>Conectar LinkedIn</b>.
        </li>
      </ol>
      <div className="rounded-lg bg-panel3 p-3 text-xs">
        <p>
          <b>60 días:</b> el permiso de LinkedIn dura 60 días y LinkedIn no da renovación automática a apps de autoservicio. La app avisa cuando falten pocos días; reconectar es un clic si sigues con sesión en LinkedIn.
        </p>
        <p className="mt-1.5">
          <b>Sin programación nativa:</b> la API solo publica al momento. «Publicar a su hora» usa una cola en este equipo y necesita la app abierta.
        </p>
        <p className="mt-1.5">
          <b>Publicar como Página</b> (cuando exista): requiere la Community Management API, que va en <b>otra app</b> (debe ser su único producto), solo para organizaciones registradas, con correo de empresa verificado, aprobación de LinkedIn y, para uso normal, el nivel Standard (formulario y vídeo de demostración). No está incluido aquí. <Enlace url="https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review">Requisitos</Enlace>
        </p>
      </div>
    </div>
  );
}

function AjustesPublicar({ est, recargar, avisar }: Props) {
  const [a, setA] = useState<Ajustes>(est.ajustes);
  const cambiar = (fn: (x: Ajustes) => Ajustes) => setA((x) => fn(structuredClone(x)));
  const guardar = async () => {
    try {
      await op('guardar-ajustes', { ajustes: a });
      avisar('Ajustes guardados');
    } catch (e: any) {
      avisar(e.message, 'error');
    }
    recargar();
  };
  const ejemplo = est.publicaciones[0];
  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-5" data-ajustes>
      <h2 className="mb-4 font-semibold">Ajustes de publicación</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">Zona de las horas del calendario</span>
          <select className="select select-sm w-full" value={a.zonaCalendario} onChange={(e) => cambiar((x) => ({ ...x, zonaCalendario: e.target.value }))} data-campo="zona-calendario">
            <option value="">La del calendario ({est.zona === 'America/Bogota' ? 'UTC−5, Bogotá' : est.zona})</option>
            {ZONAS.map((z) => (
              <option key={z} value={z}>
                {zonaCorta(z)}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-suave">El plan de redes fija las horas en UTC−5 (la hora recomendada para el público). Elige otra si las escribiste en tu hora.</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">Mostrar las horas en</span>
          <select className="select select-sm w-full" value={a.zonaVista} onChange={(e) => cambiar((x) => ({ ...x, zonaVista: e.target.value }))}>
            {ZONAS.map((z) => (
              <option key={z} value={z}>
                {zonaCorta(z)}
              </option>
            ))}
          </select>
          {ejemplo && (
            <span className="mt-1 block text-xs text-suave">
              Ejemplo: «{ejemplo.hora}» del {ejemplo.fecha} → {fechaHora(ejemplo.instante, a.zonaVista)}
            </span>
          )}
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">YouTube · categoría</span>
          <select className="select select-sm w-full" value={a.youtube.categoria} onChange={(e) => cambiar((x) => ({ ...x, youtube: { ...x.youtube, categoria: e.target.value } }))}>
            {Object.entries(CATEGORIAS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-suave">Todos los vídeos se declaran «no creados para niños».</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">Lista para vídeos largos</span>
            <input className="input input-sm w-full" value={a.youtube.listas.largo} onChange={(e) => cambiar((x) => ({ ...x, youtube: { ...x.youtube, listas: { ...x.youtube.listas, largo: e.target.value } } }))} placeholder="Sin lista" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">Lista para Shorts</span>
            <input className="input input-sm w-full" value={a.youtube.listas.short} onChange={(e) => cambiar((x) => ({ ...x, youtube: { ...x.youtube, listas: { ...x.youtube.listas, short: e.target.value } } }))} placeholder="Sin lista" />
          </label>
          <span className="col-span-2 text-xs text-suave">Nombre exacto de una lista que ya exista en el canal (se puede cambiar en cada vídeo).</span>
        </div>
        <label className="flex items-start gap-2 md:col-span-2">
          <input type="checkbox" className="checkbox checkbox-sm mt-0.5" checked={a.youtube.sintetico} onChange={(e) => cambiar((x) => ({ ...x, youtube: { ...x.youtube, sintetico: e.target.checked } }))} />
          <span className="text-sm">
            YouTube · declarar «contenido alterado o sintético realista»
            <span className="block text-xs text-suave">Solo si el vídeo muestra personas, lugares o hechos realistas generados o alterados con IA que puedan confundirse con reales. Una voz sintética narrando un tutorial normalmente no lo requiere.</span>
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">LinkedIn · puerto de la URL de redirección</span>
          <input className="input input-sm w-full" type="number" min={1024} max={65535} value={a.linkedin.puerto} onChange={(e) => cambiar((x) => ({ ...x, linkedin: { ...x.linkedin, puerto: Number(e.target.value) } }))} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">LinkedIn · versión de la API (AAAAMM)</span>
          <input className="input input-sm w-full" value={a.linkedin.version} onChange={(e) => cambiar((x) => ({ ...x, linkedin: { ...x.linkedin, version: e.target.value } }))} />
          <span className="mt-1 block text-xs text-suave">Cada versión dura al menos un año. Si LinkedIn la rechaza, pon la más reciente.</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" className="checkbox checkbox-sm mt-0.5" checked={a.linkedin.primerComentario} onChange={(e) => cambiar((x) => ({ ...x, linkedin: { ...x.linkedin, primerComentario: e.target.checked } }))} />
          <span className="text-sm">LinkedIn · poner el primer comentario (enlace del artículo) al publicar</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">Carpeta del centro de contenido</span>
          <input className="input input-sm w-full" value={a.carpetaCentro} onChange={(e) => cambiar((x) => ({ ...x, carpetaCentro: e.target.value }))} placeholder="dev/Metrica SEO/centro-contenido (por defecto)" spellCheck={false} />
          <span className="mt-1 block truncate text-xs text-suave" title={est.carpetaCentro ?? ''}>
            En uso: {est.carpetaCentro ?? 'no encontrada'} · relativa a tu carpeta personal
          </span>
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" className="btn btn-sm btn-primary" onClick={guardar} data-accion="guardar-ajustes">
          Guardar ajustes
        </button>
      </div>
    </section>
  );
}
