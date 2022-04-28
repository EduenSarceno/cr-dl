;(function(global) {

function extractMedia() {
  const regExp = /vilos\.config\.media = ({[^]*})(?=;[\s]+if \(turner_config\))/
  const query = document.querySelectorAll('script')
  for (const script of query) {
    if (script.hasAttribute('src')) {
      /*Solo nos interesa el javascript empotrado en el html*/
      continue
    }
    /* Debemos rebobinar el AFND */
    regExp.lastIndex = 0
    const code = script.textContent
    if (regExp.test(code)) {
      const json = regExp.exec(code)[1]
      return JSON.parse(json)
    }
  }
}
var media = global.media = extractMedia()

// TODO: personalizar la descarga
//   1. Calidad del video (480p, 720p, 1080p, etc)
//   2. Subtítulos a descargar (múlti-lenguaje)
//   3. Preferir hardsub en lugar softsub (individual)
var cmd;
function createCmdBat() {
  const thumbnail = media.thumbnail.url
  const title = `Episodio ${media.metadata.episode_number}`
  const subtitle = media.subtitles
    .find((s) => s.language === 'esLA')
    .url
  const video = media.streams
    .find((s) => s.hardsub_lang === null && s.format === 'adaptive_hls')
    .url

cmd = (`@echo off
echo Descargando miniatura...
curl --output cover_land.jpeg "${thumbnail}"
echo Descargando subtitulos...
curl --output subtitles.ass "${subtitle}"
echo Descargando stream HLS...
curl --output main.m3u8 "${video}"
:download_fragments
echo Descargando fragmentos...
youtube-dl --hls-prefer-native -f "[height<=720]" "${video}" -o "${title}.mp4"
if errorlevel 1 goto download_fragments
echo Muxeando elementos...
ffmpeg -i "${title}.mp4" -i "subtitles.ass" -attach "cover_land.jpeg" \
 -metadata:s:t:0 mimetype=image/jpeg -disposition:s:0 default \
 -metadata:s:s:0 language=spa -metadata:s:s:0 title="Español latino" \
 -c copy "${title}.mkv"
if not errorlevel 1 (
  echo Borrando archivos temporales...
  del cover_land.jpeg subtitles.ass main.m3u8 "${title}.mp4"
)`).replace(/\n/g, '\r\n')
}
createCmdBat()

// TODO: reemplazar el .cmd por un cliente integrado
// TODO: hacerle una interfaz gráfica
function downloadCmd() {
  const fname = `Download-EP${media.metadata.episode_number}.cmd`
  const blob = new Blob([cmd], { type: 'application/cmd' })
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(blob)
  anchor.target = '_blank'
  anchor.download = fname
  anchor.click()
}
downloadCmd()

}(window))
