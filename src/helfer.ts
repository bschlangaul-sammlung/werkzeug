import chalk from 'chalk'
import childProcess from 'child_process'
import fs from 'fs'
import path from 'path'

const konfigurationsDateiPfad = path.join(
  path.sep,
  'etc',
  'bschlangaul.config.tex'
)

const githubRawUrl =
  'https://raw.githubusercontent.com/hbschlang/lehramt-informatik/main'

export function leseDatei (pfad: string): string {
  return fs.readFileSync(pfad, { encoding: 'utf-8' })
}

export function löscheDatei (pfad: string): void {
  if (!fs.existsSync(pfad)) {
    return
  }
  fs.unlinkSync(pfad)
}

/**
 * @param pfad - Der Dateipfad, an dem die Text-Datei erzeugt werden soll.
 * @param inhalt - Der Text-Inhalt, der in die Datei geschrieben werden soll.
 */
export function schreibeDatei (pfad: string, inhalt: string): void {
  fs.mkdirSync(path.dirname(pfad), { recursive: true })
  fs.writeFileSync(pfad, inhalt, { encoding: 'utf-8' })
}

export function zeigeFehler (meldung: string): never {
  console.error(chalk.red(meldung))
  process.exit(1)
}

function leseKonfigurationsDatei (pfad: string): string {
  const inhalt = leseDatei(pfad)
  const treffer = inhalt.match(/\\LehramtInformatikRepository\{(.*)\}/)
  if (treffer == null) {
    zeigeFehler(`Konfigurations-Datei nicht gefunden: ${pfad}`)
  }
  return treffer[1]
}

export const repositoryPfad = leseKonfigurationsDatei(konfigurationsDateiPfad)

/**
 * Erzeuge einen zum Git-Repository relativen Pfad.
 *
 * @param pfad Ein möglicherweise absoluter Pfad.
 *
 * @returns z. B. `Staatsexamen/66116.../`
 */
export function macheRelativenPfad (pfad: string): string {
  pfad = pfad.replace(repositoryPfad, '')
  return pfad.replace(/^\//, '')
}

/**
 * Lese eine Text-Datei. Die Pfad kann in Segmenten angegeben werden. Handelt es
 * sich um keinen absoluten Pfad, wird angenommen, das er relativ zum
 * Lehramt-Informatik-Repository liegt.
 *
 * @param args - Pfad-Segmente
 *
 * @returns Der Inhalt der Text-Datei als String.
 */
export function leseRepoDatei (...args: string[]): string {
  let elternPfad = repositoryPfad
  // Überprüfe, ob es sich bereits um einen absoluten Pfad handelt
  if (args[0].charAt(0) === path.sep) {
    elternPfad = ''
  }
  if (args[0].includes(repositoryPfad)) {
    return leseDatei(path.join(...args))
  }
  return leseDatei(path.join(elternPfad, ...args))
}

export function macheRepoPfad (...args: string[]): string {
  if (args[0].includes(repositoryPfad)) {
    return path.join(...args)
  }
  return path.join(repositoryPfad, ...args)
}

export interface LinkEinstellung {
  /**
   * Wenn wahr, wird die PDF-Datei verlink und nicht die TeX-Datei.
   */
  linkePdf?: boolean
}

/**
 * Generiere einen Markdown- oder HTML-Link.
 *
 * @param text Der Text, der als Link gesetzt werden soll.
 * @param pfad Der Datei-Pfad, zu dem gelinkt werden soll.
 *
 * @returns Ein Link zu einer Datei auf Github, entweder im Markdown- oder im
 * HTML-Format.
 */
export function generiereLink (
  text: string,
  pfad: string,
  einstellung?: LinkEinstellung
): string {
  let linkePdf = true
  if (einstellung != null) {
    if (einstellung.linkePdf !== undefined) {
      linkePdf = einstellung.linkePdf
    }
  }
  pfad = pfad.replace(repositoryPfad, '')
  pfad = pfad.replace(/^\//, '')
  if (linkePdf) {
    pfad = pfad.replace(/\.[\w]+$/, '.pdf')
  }

  return `[${text}](${githubRawUrl}/${pfad})`
}

export function führeAus (programm: string, cwd: string): void {
  const process = childProcess.spawnSync(programm, {
    cwd: cwd,
    encoding: 'utf-8',
    shell: true
  })
  if (process.status !== 0) throw Error(process.stderr + process.stdout)
  console.log(process.stdout)
}

export function öffneProgramm (programm: string, pfad: string): void {
  const subprocess = childProcess.spawn(programm, [pfad], {
    detached: true,
    stdio: 'ignore'
  })
  subprocess.unref()
}

export function öffneVSCode (pfad: string): void {
  öffneProgramm('/usr/bin/code', macheRepoPfad(pfad))
}

/**
 * Kleine Helfer-Klasse um Strings zu sammeln in einem Array zu speichern
 * und dann per Join über Zeileumbrüche zusammenzufügen.
 */
export class AusgabeSammler {
  private readonly speicher: string[]
  private readonly redselig: boolean
  constructor (redselig = false) {
    this.speicher = []
    this.redselig = redselig
  }

  /**
   * Sammle Textausgaben. Sie werden nur gesammelt, wenn sie nicht null und kein
   * leerer String ist.
   *
   * @param ausgabe - Die Textausgabe, die gespeichert werden soll.
   */
  public sammle (ausgabe: string | undefined): void {
    if (this.redselig) {
      console.log(ausgabe)
    }
    if (ausgabe != null && ausgabe !== '') {
      this.speicher.push(ausgabe)
    }
  }

  /**
   * Leeren den Ausgabenspeicher. Dabei wir keine neues Feld erzeugt, sondern
   * alle Einträge aus dem Array gelöscht.
   */
  public leere (): void {
    this.speicher.splice(0, this.speicher.length)
  }

  /**
   * Gib die gesammelten Textschnipsel zusammengefügt als ein String zurück.
   *
   * @returns Die einzelnen Einträge des Felds mit `\n` zusammengefügt.
   */
  public gibText (): string {
    return this.speicher.join('\n')
  }
}
