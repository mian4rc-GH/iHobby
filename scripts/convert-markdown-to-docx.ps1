param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$inputFile = (Resolve-Path -LiteralPath $InputPath).Path
$outputFile = [System.IO.Path]::GetFullPath($OutputPath)
if ([System.IO.Path]::GetExtension($outputFile).ToLowerInvariant() -ne ".docx") {
  throw "OutputPath must end with .docx."
}

function Escape-Xml([string]$Value) {
  $escaped = [System.Security.SecurityElement]::Escape($Value)
  if ($null -eq $escaped) {
    return ""
  }
  return $escaped
}

function Clean-InlineMarkdown([string]$Value) {
  $clean = $Value.Trim()
  $clean = $clean -replace '`', ''
  $clean = $clean -replace '\*\*', ''
  $clean = $clean -replace '__', ''
  return $clean
}

function New-ParagraphXml([string]$Text, [string]$Style = "Normal", [bool]$Bold = $false) {
  $escaped = Escape-Xml (Clean-InlineMarkdown $Text)
  $runProperties = if ($Bold) { "<w:rPr><w:b/></w:rPr>" } else { "" }
  return '<w:p><w:pPr><w:pStyle w:val="{0}"/></w:pPr><w:r>{1}<w:t xml:space="preserve">{2}</w:t></w:r></w:p>' -f $Style, $runProperties, $escaped
}

function New-TableCellXml([string]$Text, [bool]$Bold) {
  $escaped = Escape-Xml (Clean-InlineMarkdown $Text)
  $runProperties = if ($Bold) { "<w:rPr><w:b/></w:rPr>" } else { "" }
  return '<w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/></w:tcPr><w:p><w:r>{0}<w:t xml:space="preserve">{1}</w:t></w:r></w:p></w:tc>' -f $runProperties, $escaped
}

function New-TableXml([string[][]]$Rows) {
  $columnCount = 0
  foreach ($row in $Rows) {
    if ($row.Count -gt $columnCount) {
      $columnCount = $row.Count
    }
  }
  if (-not $columnCount) { return "" }

  $grid = [System.Text.StringBuilder]::new()
  for ($index = 0; $index -lt $columnCount; $index += 1) {
    [void]$grid.Append('<w:gridCol w:w="2200"/>')
  }

  $tableRows = [System.Text.StringBuilder]::new()
  for ($rowIndex = 0; $rowIndex -lt $Rows.Count; $rowIndex += 1) {
    [void]$tableRows.Append("<w:tr>")
    foreach ($cell in $Rows[$rowIndex]) {
      [void]$tableRows.Append((New-TableCellXml $cell ($rowIndex -eq 0)))
    }
    [void]$tableRows.Append("</w:tr>")
  }

  return '<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="B7B7B7"/><w:left w:val="single" w:sz="4" w:color="B7B7B7"/><w:bottom w:val="single" w:sz="4" w:color="B7B7B7"/><w:right w:val="single" w:sz="4" w:color="B7B7B7"/><w:insideH w:val="single" w:sz="4" w:color="D9D9D9"/><w:insideV w:val="single" w:sz="4" w:color="D9D9D9"/></w:tblBorders></w:tblPr><w:tblGrid>{0}</w:tblGrid>{1}</w:tbl>' -f $grid, $tableRows
}

$lines = Get-Content -LiteralPath $inputFile -Encoding utf8
$body = [System.Text.StringBuilder]::new()

for ($index = 0; $index -lt $lines.Count; $index += 1) {
  $line = $lines[$index]

  if ($line.Trim().StartsWith("|") -and $index + 1 -lt $lines.Count -and $lines[$index + 1] -match '^\s*\|?\s*:?-{3,}') {
    $rows = [System.Collections.Generic.List[string[]]]::new()
    while ($index -lt $lines.Count -and $lines[$index].Trim().StartsWith("|")) {
      if ($lines[$index] -notmatch '^\s*\|?\s*:?-{3,}') {
        $cells = $lines[$index].Trim().Trim("|").Split("|") | ForEach-Object { $_.Trim() }
        $rows.Add([string[]]$cells)
      }
      $index += 1
    }
    $index -= 1
    [void]$body.Append((New-TableXml $rows.ToArray()))
    continue
  }

  if ([string]::IsNullOrWhiteSpace($line)) {
    continue
  }

  if ($line -match '^(#{1,3})\s+(.+)$') {
    $style = "Heading$($matches[1].Length)"
    [void]$body.Append((New-ParagraphXml $matches[2] $style))
    continue
  }

  if ($line -match '^\s*-\s+(.+)$') {
    [void]$body.Append((New-ParagraphXml ("{0} {1}" -f [char]0x2022, $matches[1]) "Normal"))
    continue
  }

  if ($line -match '^\s*(\d+)\.\s+(.+)$') {
    [void]$body.Append((New-ParagraphXml "$($matches[1]). $($matches[2])" "Normal"))
    continue
  }

  [void]$body.Append((New-ParagraphXml $line "Normal"))
}

$stage = Join-Path ([System.IO.Path]::GetTempPath()) "ihobbyword-docx-$([guid]::NewGuid().ToString('N'))"
$wordDirectory = Join-Path $stage "word"
$relationshipsDirectory = Join-Path $stage "_rels"
$wordRelationshipsDirectory = Join-Path $wordDirectory "_rels"
New-Item -ItemType Directory -Force -Path $wordDirectory, $relationshipsDirectory, $wordRelationshipsDirectory | Out-Null

$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
'@

$rootRelationships = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'@

$documentRelationships = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
'@

$styles = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:lang w:val="en-US"/></w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style>
</w:styles>
'@

$document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{0}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>' -f $body

Set-Content -LiteralPath (Join-Path $stage "[Content_Types].xml") -Value $contentTypes -Encoding utf8
Set-Content -LiteralPath (Join-Path $relationshipsDirectory ".rels") -Value $rootRelationships -Encoding utf8
Set-Content -LiteralPath (Join-Path $wordRelationshipsDirectory "document.xml.rels") -Value $documentRelationships -Encoding utf8
Set-Content -LiteralPath (Join-Path $wordDirectory "styles.xml") -Value $styles -Encoding utf8
Set-Content -LiteralPath (Join-Path $wordDirectory "document.xml") -Value $document -Encoding utf8

$outputDirectory = Split-Path -Parent $outputFile
if ($outputDirectory) {
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
}
if (Test-Path -LiteralPath $outputFile) {
  Remove-Item -LiteralPath $outputFile -Force
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open(
  $outputFile,
  [System.IO.Compression.ZipArchiveMode]::Create
)
try {
  Get-ChildItem -LiteralPath $stage -Recurse -File | ForEach-Object {
    $entryName = $_.FullName.Substring($stage.Length).TrimStart([char]'\').Replace('\', '/')
    $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $inputStream = [System.IO.File]::OpenRead($_.FullName)
    $outputStream = $entry.Open()
    try {
      $inputStream.CopyTo($outputStream)
    } finally {
      $outputStream.Dispose()
      $inputStream.Dispose()
    }
  }
} finally {
  $archive.Dispose()
}
Remove-Item -LiteralPath $stage -Recurse -Force

Write-Output "Created $outputFile"
