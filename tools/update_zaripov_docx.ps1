param(
    [Parameter(Mandatory=$true)]
    [string]$SourceDocx,

    [Parameter(Mandatory=$true)]
    [string]$OutputDocx,

    [string]$ContentPath = (Join-Path $PSScriptRoot 'zaripov_sections_content.txt')
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression.FileSystem

$W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
$R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
$REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
$CT_NS = 'http://schemas.openxmlformats.org/package/2006/content-types'

function Assert-UnderPath([string]$Path, [string]$Root) {
    $resolvedPath = [IO.Path]::GetFullPath($Path)
    $resolvedRoot = [IO.Path]::GetFullPath($Root)
    if (-not $resolvedPath.StartsWith($resolvedRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to operate outside root. Path=$resolvedPath Root=$resolvedRoot"
    }
}

function Escape-Xml([string]$Text) {
    if ($null -eq $Text) { return '' }
    return [Security.SecurityElement]::Escape($Text)
}

function Utf8Text([string]$Base64) {
    return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Base64))
}

function New-XmlWriterSettings {
    $settings = New-Object System.Xml.XmlWriterSettings
    $settings.Encoding = New-Object System.Text.UTF8Encoding($false)
    $settings.Indent = $false
    return $settings
}

function Save-XmlUtf8([xml]$Xml, [string]$Path) {
    $settings = New-XmlWriterSettings
    $writer = [Xml.XmlWriter]::Create($Path, $settings)
    try {
        $Xml.Save($writer)
    } finally {
        $writer.Close()
    }
}

function Add-Fragment([xml]$Doc, [Xml.XmlNode]$Parent, [Xml.XmlNode]$Before, [string]$InnerXml) {
    $fragment = $Doc.CreateDocumentFragment()
    $fragment.InnerXml = $InnerXml
    [void]$Parent.InsertBefore($fragment, $Before)
}

function New-ParagraphXml(
    [string]$Text,
    [string]$Style = '',
    [bool]$Bold = $false,
    [bool]$Italic = $false,
    [string]$Justify = 'both',
    [int]$Size = 28,
    [string]$Font = 'Times New Roman',
    [bool]$FirstLine = $true,
    [int]$After = 0,
    [string]$Shading = '',
    [bool]$PageBreakBefore = $false
) {
    $pPr = ''
    if ($Style) { $pPr += "<w:pStyle w:val=`"$Style`"/>" }
    if ($PageBreakBefore) { $pPr += '<w:pageBreakBefore/>' }
    if ($Justify) { $pPr += "<w:jc w:val=`"$Justify`"/>" }
    $pPr += "<w:spacing w:after=`"$After`" w:line=`"360`" w:lineRule=`"auto`"/>"
    if ($FirstLine) { $pPr += '<w:ind w:firstLine="708"/>' }
    if ($Shading) { $pPr += "<w:shd w:val=`"clear`" w:color=`"auto`" w:fill=`"$Shading`"/>" }

    $rPr = "<w:rFonts w:ascii=`"$Font`" w:hAnsi=`"$Font`" w:cs=`"$Font`"/><w:sz w:val=`"$Size`"/><w:szCs w:val=`"$Size`"/>"
    if ($Bold) { $rPr += '<w:b/><w:bCs/>' }
    if ($Italic) { $rPr += '<w:i/><w:iCs/>' }

    $escaped = Escape-Xml $Text
    return "<w:p xmlns:w=`"$W_NS`"><w:pPr>$pPr</w:pPr><w:r><w:rPr>$rPr</w:rPr><w:t xml:space=`"preserve`">$escaped</w:t></w:r></w:p>"
}

function New-CodeParagraphXml([string]$Text) {
    $escaped = Escape-Xml $Text
    return "<w:p xmlns:w=`"$W_NS`"><w:pPr><w:spacing w:after=`"0`" w:line=`"220`" w:lineRule=`"auto`"/><w:shd w:val=`"clear`" w:color=`"auto`" w:fill=`"F2F2F2`"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii=`"Courier New`" w:hAnsi=`"Courier New`" w:cs=`"Courier New`"/><w:sz w:val=`"18`"/><w:szCs w:val=`"18`"/></w:rPr><w:t xml:space=`"preserve`">$escaped</w:t></w:r></w:p>"
}

function New-TableXml([string[]]$Header, [object[]]$Rows) {
    $cols = [Math]::Max(1, $Header.Count)
    $width = [int](9000 / $cols)
    $grid = ''
    for ($i = 0; $i -lt $cols; $i++) { $grid += "<w:gridCol w:w=`"$width`"/>" }

    function CellXml([string]$Text, [bool]$IsHeader, [int]$Width) {
        $fill = if ($IsHeader) { 'D9EAF7' } else { 'FFFFFF' }
        $bold = if ($IsHeader) { '<w:b/><w:bCs/>' } else { '' }
        $escaped = Escape-Xml $Text
        return "<w:tc><w:tcPr><w:tcW w:w=`"$Width`" w:type=`"dxa`"/><w:shd w:val=`"clear`" w:color=`"auto`" w:fill=`"$fill`"/></w:tcPr><w:p><w:pPr><w:spacing w:after=`"0`" w:line=`"280`" w:lineRule=`"auto`"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii=`"Times New Roman`" w:hAnsi=`"Times New Roman`" w:cs=`"Times New Roman`"/><w:sz w:val=`"22`"/><w:szCs w:val=`"22`"/>$bold</w:rPr><w:t xml:space=`"preserve`">$escaped</w:t></w:r></w:p></w:tc>"
    }

    $xml = "<w:tbl xmlns:w=`"$W_NS`"><w:tblPr><w:tblW w:w=`"9000`" w:type=`"dxa`"/><w:tblBorders><w:top w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"999999`"/><w:left w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"999999`"/><w:bottom w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"999999`"/><w:right w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"999999`"/><w:insideH w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"999999`"/><w:insideV w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"999999`"/></w:tblBorders><w:tblCellMar><w:top w:w=`"80`" w:type=`"dxa`"/><w:left w:w=`"80`" w:type=`"dxa`"/><w:bottom w:w=`"80`" w:type=`"dxa`"/><w:right w:w=`"80`" w:type=`"dxa`"/></w:tblCellMar></w:tblPr><w:tblGrid>$grid</w:tblGrid>"
    $xml += '<w:tr>'
    foreach ($cell in $Header) { $xml += CellXml $cell $true $width }
    $xml += '</w:tr>'
    foreach ($row in $Rows) {
        $xml += '<w:tr>'
        foreach ($cell in $row) { $xml += CellXml ([string]$cell) $false $width }
        $xml += '</w:tr>'
    }
    $xml += '</w:tbl>'
    return $xml
}

function Get-PngSize([string]$Path) {
    $bytes = [IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -lt 24) { throw "Invalid PNG file: $Path" }
    $wBytes = $bytes[16..19]
    $hBytes = $bytes[20..23]
    [Array]::Reverse($wBytes)
    [Array]::Reverse($hBytes)
    return [pscustomobject]@{
        Width = [BitConverter]::ToInt32($wBytes, 0)
        Height = [BitConverter]::ToInt32($hBytes, 0)
    }
}

function New-ImageParagraphXml([string]$RelId, [int64]$Cx, [int64]$Cy, [int]$DocPrId, [string]$Name) {
    $safeName = Escape-Xml $Name
    return @"
<w:p xmlns:w="$W_NS" xmlns:r="$R_NS" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:pPr><w:jc w:val="center"/></w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="$Cx" cy="$Cy"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="$DocPrId" name="$safeName"/>
        <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
              <pic:nvPicPr><pic:cNvPr id="$DocPrId" name="$safeName"/><pic:cNvPicPr/></pic:nvPicPr>
              <pic:blipFill><a:blip r:embed="$RelId"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
              <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="$Cx" cy="$Cy"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>
"@
}

function Parse-Content([string]$Path) {
    $lines = [IO.File]::ReadAllLines($Path, [Text.Encoding]::UTF8)
    $blocks = New-Object System.Collections.Generic.List[object]
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line.StartsWith('@@h1 ')) {
            $blocks.Add([pscustomobject]@{ Type='h1'; Text=$line.Substring(5) })
        } elseif ($line.StartsWith('@@h2 ')) {
            $blocks.Add([pscustomobject]@{ Type='h2'; Text=$line.Substring(5) })
        } elseif ($line.StartsWith('@@h3 ')) {
            $blocks.Add([pscustomobject]@{ Type='h3'; Text=$line.Substring(5) })
        } elseif ($line.StartsWith('@@p ')) {
            $blocks.Add([pscustomobject]@{ Type='p'; Text=$line.Substring(4) })
        } elseif ($line.StartsWith('@@b ')) {
            $blocks.Add([pscustomobject]@{ Type='b'; Text=$line.Substring(4) })
        } elseif ($line.StartsWith('@@caption ')) {
            $blocks.Add([pscustomobject]@{ Type='caption'; Text=$line.Substring(10) })
        } elseif ($line.StartsWith('@@figure|')) {
            $parts = $line.Split('|', 3)
            $blocks.Add([pscustomobject]@{ Type='figure'; Path=$parts[1]; Caption=$parts[2] })
        } elseif ($line.StartsWith('@@placeholder|')) {
            $parts = $line.Split('|', 3)
            $blocks.Add([pscustomobject]@{ Type='placeholder'; Text=$parts[1]; Caption=$parts[2] })
        } elseif ($line.StartsWith('@@table|')) {
            $caption = $line.Substring(8)
            $i++
            $header = $lines[$i].Split('|')
            $rows = New-Object System.Collections.Generic.List[object]
            while ($i + 1 -lt $lines.Count -and $lines[$i + 1] -ne '@@endtable') {
                $i++
                $rows.Add($lines[$i].Split('|'))
            }
            if ($i + 1 -lt $lines.Count -and $lines[$i + 1] -eq '@@endtable') { $i++ }
            $blocks.Add([pscustomobject]@{ Type='table'; Caption=$caption; Header=$header; Rows=$rows.ToArray() })
        } elseif ($line.StartsWith('@@code|')) {
            $title = $line.Substring(7)
            $code = New-Object System.Collections.Generic.List[string]
            while ($i + 1 -lt $lines.Count -and $lines[$i + 1] -ne '@@endcode') {
                $i++
                $code.Add($lines[$i])
            }
            if ($i + 1 -lt $lines.Count -and $lines[$i + 1] -eq '@@endcode') { $i++ }
            $blocks.Add([pscustomobject]@{ Type='code'; Title=$title; Lines=$code.ToArray() })
        } else {
            $blocks.Add([pscustomobject]@{ Type='p'; Text=$line })
        }
    }
    return $blocks
}

$repoRoot = (Split-Path $PSScriptRoot -Parent)
$tempRoot = Join-Path $repoRoot '.docx_build'
Assert-UnderPath $tempRoot $repoRoot
if (Test-Path $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $tempRoot | Out-Null

$extractDir = Join-Path $tempRoot 'extract'
[System.IO.Compression.ZipFile]::ExtractToDirectory($SourceDocx, $extractDir)

$documentPath = Join-Path $extractDir 'word/document.xml'
$relsPath = Join-Path $extractDir 'word/_rels/document.xml.rels'
$contentTypesPath = Join-Path $extractDir '[Content_Types].xml'
$mediaDir = Join-Path $extractDir 'word/media'
if (-not (Test-Path $mediaDir)) { New-Item -ItemType Directory -Path $mediaDir | Out-Null }

[xml]$document = [IO.File]::ReadAllText($documentPath, [Text.Encoding]::UTF8)
$ns = New-Object Xml.XmlNamespaceManager($document.NameTable)
$ns.AddNamespace('w', $W_NS)

$body = $document.SelectSingleNode('//w:body', $ns)
if (-not $body) { throw 'word/document.xml has no w:body node' }

function NodeText([Xml.XmlNode]$Node) {
    $items = $Node.SelectNodes('.//w:t', $ns)
    return (($items | ForEach-Object { $_.'#text' }) -join '').Trim()
}

function NodeStyle([Xml.XmlNode]$Node) {
    $styleNode = $Node.SelectSingleNode('./w:pPr/w:pStyle', $ns)
    if (-not $styleNode) { return '' }
    return $styleNode.GetAttribute('val', $W_NS)
}

$startNode = $null
$endNode = $null
foreach ($child in @($body.ChildNodes)) {
    $text = NodeText $child
    $style = NodeStyle $child
    if (-not $startNode -and $style -eq '1' -and $text.StartsWith('2')) {
        $startNode = $child
        continue
    }
    if ($startNode -and $style -eq '1' -and -not $text.StartsWith('2') -and -not $text.StartsWith('3')) {
        $endNode = $child
        break
    }
}
if (-not $startNode) { throw 'Could not find section 2 heading' }
if (-not $endNode) { throw 'Could not find conclusion heading' }

$node = $startNode
while ($node -and -not [object]::ReferenceEquals($node, $endNode)) {
    $next = $node.NextSibling
    [void]$body.RemoveChild($node)
    $node = $next
}

[xml]$rels = [IO.File]::ReadAllText($relsPath, [Text.Encoding]::UTF8)
$relRoot = $rels.DocumentElement
$maxRid = 0
foreach ($rel in $relRoot.ChildNodes) {
    $id = $rel.GetAttribute('Id')
    if ($id -match '^rId(\d+)$') {
        $n = [int]$Matches[1]
        if ($n -gt $maxRid) { $maxRid = $n }
    }
}

[xml]$contentTypes = [IO.File]::ReadAllText($contentTypesPath, [Text.Encoding]::UTF8)
$hasPng = $false
foreach ($child in $contentTypes.DocumentElement.ChildNodes) {
    if ($child.LocalName -eq 'Default' -and $child.GetAttribute('Extension') -eq 'png') { $hasPng = $true; break }
}
if (-not $hasPng) {
    $def = $contentTypes.CreateElement('Default', $CT_NS)
    $def.SetAttribute('Extension', 'png')
    $def.SetAttribute('ContentType', 'image/png')
    [void]$contentTypes.DocumentElement.AppendChild($def)
}

$blocks = Parse-Content $ContentPath
$appendixCodeBlocks = New-Object System.Collections.Generic.List[object]
$imageIndex = 0
$docPrId = 100

foreach ($block in $blocks) {
    switch ($block.Type) {
        'h1' {
            Add-Fragment $document $body $endNode (New-ParagraphXml $block.Text '1' $true $false 'center' 28 'Times New Roman' $false 0)
        }
        'h2' {
            Add-Fragment $document $body $endNode (New-ParagraphXml $block.Text '2' $true $false 'both' 28 'Times New Roman' $false 0)
        }
        'h3' {
            Add-Fragment $document $body $endNode (New-ParagraphXml $block.Text '3' $true $false 'both' 28 'Times New Roman' $false 0)
        }
        'p' {
            Add-Fragment $document $body $endNode (New-ParagraphXml $block.Text '' $false $false 'both' 28 'Times New Roman' $true 0)
        }
        'b' {
            Add-Fragment $document $body $endNode (New-ParagraphXml $block.Text 'a7' $false $false 'both' 28 'Times New Roman' $false 0)
        }
        'caption' {
            Add-Fragment $document $body $endNode (New-ParagraphXml $block.Text '' $false $false 'center' 24 'Times New Roman' $false 120)
        }
        'figure' {
            if (-not (Test-Path $block.Path)) { throw "Image file not found: $($block.Path)" }
            $imageIndex++
            $maxRid++
            $rid = "rId$maxRid"
            $mediaName = "zaripov_section_diagram_$imageIndex.png"
            Copy-Item -LiteralPath $block.Path -Destination (Join-Path $mediaDir $mediaName) -Force

            $rel = $rels.CreateElement('Relationship', $REL_NS)
            $rel.SetAttribute('Id', $rid)
            $rel.SetAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')
            $rel.SetAttribute('Target', "media/$mediaName")
            [void]$relRoot.AppendChild($rel)

            $size = Get-PngSize $block.Path
            $maxCx = [int64](6.35 * 914400)
            $maxCy = [int64](6.85 * 914400)
            $cx = $maxCx
            $cy = [int64]([double]$size.Height * [double]$cx / [double]$size.Width)
            if ($cy -gt $maxCy) {
                $cy = $maxCy
                $cx = [int64]([double]$size.Width * [double]$cy / [double]$size.Height)
            }
            $docPrId++
            Add-Fragment $document $body $endNode (New-ImageParagraphXml $rid $cx $cy $docPrId $block.Caption)
            Add-Fragment $document $body $endNode (New-ParagraphXml $block.Caption 'af7' $false $false 'center' 24 'Times New Roman' $false 160)
        }
        'placeholder' {
            Add-Fragment $document $body $endNode (New-ParagraphXml $block.Text '' $true $false 'center' 24 'Times New Roman' $false 160 'FFF2CC')
            Add-Fragment $document $body $endNode (New-ParagraphXml $block.Caption 'af7' $false $false 'center' 24 'Times New Roman' $false 160)
        }
        'table' {
            Add-Fragment $document $body $endNode (New-ParagraphXml $block.Caption '' $false $false 'center' 24 'Times New Roman' $false 80)
            Add-Fragment $document $body $endNode (New-TableXml $block.Header $block.Rows)
            Add-Fragment $document $body $endNode (New-ParagraphXml '' '' $false $false 'both' 28 'Times New Roman' $false 80)
        }
        'code' {
            $appendixNumber = $appendixCodeBlocks.Count + 1
            $appendixCodeBlocks.Add($block)
            $refPrefix = Utf8Text '0J/QvtC70L3Ri9C5INGC0LXQutGB0YIg0YTRgNCw0LPQvNC10L3RgtCwINC/0YDQuNCy0LXQtNC10L0g0LIg0L/RgNC40LvQvtC20LXQvdC40Lgg0JAgKNGB0LwuINCb0LjRgdGC0LjQvdCzINCQLg=='
            Add-Fragment $document $body $endNode (New-ParagraphXml ($refPrefix + $appendixNumber + ').') '' $false $false 'both' 28 'Times New Roman' $true 80)
        }
    }
}

$appendBefore = $body.SelectSingleNode('./w:sectPr', $ns)
if ($appendixCodeBlocks.Count -gt 0) {
    $appendixTitle = Utf8Text '0J/QoNCY0JvQntCW0JXQndCY0JUg0JA='
    $appendixSubtitle = Utf8Text '0JvQuNGB0YLQuNC90LPQuCDQv9GA0L7Qs9GA0LDQvNC80L3QvtCz0L4g0LrQvtC00LA='
    $listingPrefix = Utf8Text '0JvQuNGB0YLQuNC90LMg0JAu'

    Add-Fragment $document $body $appendBefore (New-ParagraphXml $appendixTitle '1' $true $false 'center' 28 'Times New Roman' $false 0 '' $true)
    Add-Fragment $document $body $appendBefore (New-ParagraphXml $appendixSubtitle '' $true $false 'center' 28 'Times New Roman' $false 160)

    for ($i = 0; $i -lt $appendixCodeBlocks.Count; $i++) {
        $codeBlock = $appendixCodeBlocks[$i]
        $titleParts = ([string]$codeBlock.Title).Split(@(' - '), 2, [StringSplitOptions]::None)
        $cleanTitle = if ($titleParts.Count -gt 1) { $titleParts[1] } else { [string]$codeBlock.Title }
        $appendixListingTitle = $listingPrefix + ($i + 1) + ' - ' + $cleanTitle
        Add-Fragment $document $body $appendBefore (New-ParagraphXml $appendixListingTitle '' $false $false 'center' 24 'Times New Roman' $false 80)
        foreach ($codeLine in $codeBlock.Lines) {
            Add-Fragment $document $body $appendBefore (New-CodeParagraphXml $codeLine)
        }
        Add-Fragment $document $body $appendBefore (New-ParagraphXml '' '' $false $false 'both' 28 'Times New Roman' $false 80)
    }
}

$seePrefix = '(' + [char]0x0441 + [char]0x043C + '.'
$seePattern = '([^\s])' + [regex]::Escape($seePrefix)
foreach ($textNode in $document.SelectNodes('//w:t', $ns)) {
    $oldValue = $textNode.InnerText
    $newValue = [regex]::Replace($oldValue, $seePattern, ('$1 ' + $seePrefix))
    if ($newValue -ne $oldValue) {
        $textNode.InnerText = $newValue
    }
}

Save-XmlUtf8 $document $documentPath
Save-XmlUtf8 $rels $relsPath
Save-XmlUtf8 $contentTypes $contentTypesPath

$settingsPath = Join-Path $extractDir 'word/settings.xml'
if (Test-Path $settingsPath) {
    [xml]$settingsXml = [IO.File]::ReadAllText($settingsPath, [Text.Encoding]::UTF8)
    $settingsNs = New-Object Xml.XmlNamespaceManager($settingsXml.NameTable)
    $settingsNs.AddNamespace('w', $W_NS)
    $update = $settingsXml.SelectSingleNode('//w:updateFields', $settingsNs)
    if ($update) {
        [void]$update.ParentNode.RemoveChild($update)
    }
    Save-XmlUtf8 $settingsXml $settingsPath
}

if (Test-Path $OutputDocx) { Remove-Item -LiteralPath $OutputDocx -Force }
$zipOutput = [System.IO.Compression.ZipFile]::Open($OutputDocx, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $base = [IO.Path]::GetFullPath($extractDir).TrimEnd('\')
    foreach ($file in Get-ChildItem -LiteralPath $extractDir -Recurse -File) {
        $full = [IO.Path]::GetFullPath($file.FullName)
        $entryName = $full.Substring($base.Length + 1).Replace('\', '/')
        [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zipOutput,
            $full,
            $entryName,
            [System.IO.Compression.CompressionLevel]::Optimal
        )
    }
} finally {
    $zipOutput.Dispose()
}

[pscustomobject]@{
    Output = $OutputDocx
    Blocks = $blocks.Count
    ImagesInserted = $imageIndex
} | Format-List
