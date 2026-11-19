"""
Genera servidor/equipo-manifiesto.json: lo que «Preparar este equipo» descarga en un equipo sin Python.

  py herramientas/manifiesto-equipo.py

Todo sale de fuentes oficiales y con su huella fijada aquí, para que la app la compruebe al descargar:
  - Python embebible de python.org (SHA-256 publicado en la página de la versión).
  - pip y los paquetes, de PyPI (SHA-256 de cada wheel, de la API JSON de PyPI). Las versiones son las que
    funcionan hoy en este equipo (`pip freeze` del Python del sistema), resueltas para cp313 / win_amd64.
  - El modelo de whisper «small» del repositorio oficial de Systran en Hugging Face, fijado a una revisión
    (SHA-256 de LFS para model.bin y huella git para el resto).
Requiere el Python del sistema con pip y conexión. Se vuelve a ejecutar solo para cambiar de versiones.
"""
import json, os, subprocess, sys, tempfile, urllib.request, re

PY_VERSION = '3.13.15'
GRUPOS = {
    'base': {
        'titulo': 'Voz, subtítulos y audio',
        'usadoPara': 'regenerar la voz, subtítulos automáticos, mejorar voz, sonoridad y fluidez',
        'paquetes': ['edge-tts==7.3.1', 'faster-whisper==1.2.1', 'numpy==2.5.3', 'scipy==1.18.1', 'av==19.0.1'],
        'modulos': ['edge_tts', 'faster_whisper', 'numpy', 'scipy', 'av'],
    },
    'ia': {
        'titulo': 'Efectos de IA',
        'usadoPara': 'quitar el fondo de imágenes y vídeos, y seguimiento de objetos',
        'paquetes': ['rembg==2.0.85', 'pillow==12.3.0', 'imageio-ffmpeg==0.6.0', 'opencv-contrib-python-headless==4.10.0.84'],
        'modulos': ['rembg', 'PIL', 'imageio_ffmpeg', 'cv2'],
    },
}
MODELO = {'repo': 'Systran/faster-whisper-small', 'nombre': 'faster-whisper-small', 'grupo': 'base'}

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'servidor', 'equipo-manifiesto.json')


def leer(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def json_url(url):
    return json.loads(leer(url).decode('utf-8'))


def resolver(reqs, tmp, nombre):
    """Lista cerrada de wheels (nombre, versión) que instala pip para estos requisitos, con las versiones de hoy."""
    freeze = subprocess.check_output([sys.executable, '-m', 'pip', 'freeze'], text=True)
    cons = os.path.join(tmp, 'cons.txt')
    open(cons, 'w', encoding='utf-8').write('\n'.join(l for l in freeze.splitlines() if '@' not in l and not l.startswith('-e')))
    req = os.path.join(tmp, f'{nombre}.txt')
    open(req, 'w', encoding='utf-8').write('\n'.join(reqs))
    rep = os.path.join(tmp, f'{nombre}.json')
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--dry-run', '--ignore-installed', '--only-binary=:all:', '--quiet',
                           '--python-version', '3.13', '--platform', 'win_amd64', '--implementation', 'cp', '--target', os.path.join(tmp, 't'),
                           '--report', rep, '-r', req, '-c', cons])
    d = json.load(open(rep, encoding='utf-8'))
    return {i['metadata']['name'].lower(): i['metadata']['version'] for i in d['install']}


def wheel(nombre, version):
    """El wheel que elige pip para cp313 / win_amd64, con su URL, tamaño y SHA-256 de PyPI."""
    d = json_url(f'https://pypi.org/pypi/{nombre}/{version}/json')
    ok = [u for u in d['urls'] if u['packagetype'] == 'bdist_wheel']
    def puntos(u):
        f = u['filename']
        tags = f[:-4].split('-')[-3:]
        py, abi, plat = tags
        if plat not in ('win_amd64', 'any'):
            return -1
        s = 3 if plat == 'win_amd64' else 1
        if 'cp313' in py.split('.') and abi in ('cp313',):
            s += 10
        elif abi == 'abi3' or abi == 'none':
            s += 5
        else:
            return -1
        return s
    mejor = max(ok, key=puntos)
    if puntos(mejor) < 0:
        raise SystemExit(f'Sin wheel para cp313/win_amd64: {nombre} {version}')
    return {'nombre': nombre, 'version': version, 'archivo': mejor['filename'], 'url': mejor['url'],
            'sha256': mejor['digests']['sha256'], 'tam': mejor['size']}


def python_embebible():
    url = f'https://www.python.org/ftp/python/{PY_VERSION}/python-{PY_VERSION}-embed-amd64.zip'
    pagina = leer(f'https://www.python.org/downloads/release/python-{PY_VERSION.replace(".", "")}/').decode('utf-8')
    i = pagina.index(f'python-{PY_VERSION}-embed-amd64.zip"')
    trozo = pagina[i:i + 3000]
    m = re.search(r'class="checksum">(.*?)</code>', trozo, re.S)
    sha = re.sub(r'<[^>]+>|\s', '', m.group(1))
    if not re.fullmatch(r'[0-9a-f]{64}', sha):
        raise SystemExit('No se pudo leer el SHA-256 de python.org')
    req = urllib.request.Request(url, method='HEAD')
    with urllib.request.urlopen(req, timeout=60) as r:
        tam = int(r.headers['Content-Length'])
    return {'version': PY_VERSION, 'archivo': os.path.basename(url), 'url': url, 'sha256': sha, 'tam': tam, 'pth': 'python313._pth'}


def modelo():
    info = json_url(f'https://huggingface.co/api/models/{MODELO["repo"]}')
    rev = info['sha']
    arbol = json_url(f'https://huggingface.co/api/models/{MODELO["repo"]}/tree/{rev}')
    archivos = []
    for f in arbol:
        if f['type'] != 'file' or f['path'] in ('.gitattributes', 'README.md'):
            continue
        a = {'ruta': f['path'], 'tam': f['size'], 'url': f'https://huggingface.co/{MODELO["repo"]}/resolve/{rev}/{f["path"]}'}
        if f.get('lfs'):
            a['sha256'] = f['lfs']['oid']
        else:
            a['gitOid'] = f['oid']
        archivos.append(a)
    return {**MODELO, 'revision': rev, 'archivos': archivos}


def main():
    tmp = tempfile.mkdtemp()
    base = resolver(GRUPOS['base']['paquetes'], tmp, 'base')
    todo = resolver(GRUPOS['base']['paquetes'] + GRUPOS['ia']['paquetes'], tmp, 'todo')
    cambian = [n for n in base if todo.get(n) != base[n]]
    if cambian:
        raise SystemExit(f'Los efectos de IA cambiarían versiones de la base: {cambian}')
    pip = json_url('https://pypi.org/pypi/pip/json')['info']['version']
    grupos = {}
    for g, lista in (('base', base), ('ia', {n: v for n, v in todo.items() if n not in base})):
        w = [wheel(n, v) for n, v in sorted(lista.items())]
        grupos[g] = {**{k: GRUPOS[g][k] for k in ('titulo', 'usadoPara', 'modulos')}, 'paquetes': w}
        print(g, len(w), 'paquetes,', round(sum(x['tam'] for x in w) / 1e6), 'MB')
    m = {
        'generado': 'herramientas/manifiesto-equipo.py',
        'python': python_embebible(),
        'pip': wheel('pip', pip),
        'grupos': grupos,
        'modelos': [modelo()],
    }
    json.dump(m, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('Escrito', SALIDA)


if __name__ == '__main__':
    main()
