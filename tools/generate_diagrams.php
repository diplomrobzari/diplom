<?php

$outputDir = __DIR__ . '/../docs/diagrams';
if (!is_dir($outputDir)) {
    mkdir($outputDir, 0775, true);
}

$font = 'C:/Windows/Fonts/arial.ttf';
if (!file_exists($font)) {
    $font = __DIR__ . '/../backend/storage/fonts/arial.ttf';
}

function color($image, string $hex): int
{
    $hex = ltrim($hex, '#');
    return imagecolorallocate(
        $image,
        hexdec(substr($hex, 0, 2)),
        hexdec(substr($hex, 2, 2)),
        hexdec(substr($hex, 4, 2))
    );
}

function textBox($image, string $text, int $x, int $y, int $w, int $h, array $style): void
{
    $fill = color($image, $style['fill'] ?? '#ffffff');
    $stroke = color($image, $style['stroke'] ?? '#111827');
    $textColor = color($image, $style['text'] ?? '#111827');
    $radius = $style['radius'] ?? 22;

    imagefilledroundedrectangle($image, $x, $y, $x + $w, $y + $h, $radius, $fill);
    imageroundedrectangle($image, $x, $y, $x + $w, $y + $h, $radius, $stroke);

    drawWrappedText($image, $text, $x + 18, $y + 24, $w - 36, $textColor, $style['size'] ?? 18, $style['font']);
}

function drawWrappedText($image, string $text, int $x, int $y, int $maxWidth, int $color, int $size, string $font): void
{
    $lines = [];
    foreach (explode("\n", $text) as $paragraph) {
        $words = preg_split('/\s+/u', trim($paragraph));
        $line = '';
        foreach ($words as $word) {
            $candidate = trim($line . ' ' . $word);
            $box = imagettfbbox($size, 0, $font, $candidate);
            if (($box[2] - $box[0]) > $maxWidth && $line !== '') {
                $lines[] = $line;
                $line = $word;
            } else {
                $line = $candidate;
            }
        }
        if ($line !== '') {
            $lines[] = $line;
        }
    }

    foreach ($lines as $index => $line) {
        imagettftext($image, $size, 0, $x, $y + ($index * ($size + 10)), $color, $font, $line);
    }
}

function titleText($image, string $text, string $font): void
{
    $purple = color($image, '#5B21B6');
    imagettftext($image, 34, 0, 60, 70, $purple, $font, $text);
}

function arrow($image, int $x1, int $y1, int $x2, int $y2, string $hex = '#374151'): void
{
    $c = color($image, $hex);
    imagesetthickness($image, 3);
    imageline($image, $x1, $y1, $x2, $y2, $c);
    $angle = atan2($y2 - $y1, $x2 - $x1);
    $len = 14;
    $a1 = $angle + pi() * 0.82;
    $a2 = $angle - pi() * 0.82;
    imageline($image, $x2, $y2, (int) ($x2 + cos($a1) * $len), (int) ($y2 + sin($a1) * $len), $c);
    imageline($image, $x2, $y2, (int) ($x2 + cos($a2) * $len), (int) ($y2 + sin($a2) * $len), $c);
    imagesetthickness($image, 1);
}

function baseImage(): GdImage
{
    $image = imagecreatetruecolor(1600, 1000);
    imageantialias($image, true);
    imagefill($image, 0, 0, color($image, '#F8FAFC'));
    return $image;
}

function saveDiagram(GdImage $image, string $path): void
{
    imagepng($image, $path, 6);
    imagedestroy($image);
}

if (!function_exists('imagefilledroundedrectangle')) {
    function imagefilledroundedrectangle($image, int $x1, int $y1, int $x2, int $y2, int $radius, int $color): void
    {
        imagefilledrectangle($image, $x1 + $radius, $y1, $x2 - $radius, $y2, $color);
        imagefilledrectangle($image, $x1, $y1 + $radius, $x2, $y2 - $radius, $color);
        imagefilledellipse($image, $x1 + $radius, $y1 + $radius, $radius * 2, $radius * 2, $color);
        imagefilledellipse($image, $x2 - $radius, $y1 + $radius, $radius * 2, $radius * 2, $color);
        imagefilledellipse($image, $x1 + $radius, $y2 - $radius, $radius * 2, $radius * 2, $color);
        imagefilledellipse($image, $x2 - $radius, $y2 - $radius, $radius * 2, $radius * 2, $color);
    }
}

if (!function_exists('imageroundedrectangle')) {
    function imageroundedrectangle($image, int $x1, int $y1, int $x2, int $y2, int $radius, int $color): void
    {
        imageline($image, $x1 + $radius, $y1, $x2 - $radius, $y1, $color);
        imageline($image, $x1 + $radius, $y2, $x2 - $radius, $y2, $color);
        imageline($image, $x1, $y1 + $radius, $x1, $y2 - $radius, $color);
        imageline($image, $x2, $y1 + $radius, $x2, $y2 - $radius, $color);
        imagearc($image, $x1 + $radius, $y1 + $radius, $radius * 2, $radius * 2, 180, 270, $color);
        imagearc($image, $x2 - $radius, $y1 + $radius, $radius * 2, $radius * 2, 270, 360, $color);
        imagearc($image, $x1 + $radius, $y2 - $radius, $radius * 2, $radius * 2, 90, 180, $color);
        imagearc($image, $x2 - $radius, $y2 - $radius, $radius * 2, $radius * 2, 0, 90, $color);
    }
}

$common = ['font' => $font, 'fill' => '#FFFFFF', 'stroke' => '#7C3AED', 'text' => '#111827'];
$accent = ['font' => $font, 'fill' => '#ECFCCB', 'stroke' => '#65A30D', 'text' => '#111827'];
$danger = ['font' => $font, 'fill' => '#FEE2E2', 'stroke' => '#DC2626', 'text' => '#111827'];

$image = baseImage();
titleText($image, 'Диаграмма вариантов использования', $font);
textBox($image, "Участник", 70, 180, 230, 90, $accent);
textBox($image, "Организатор", 70, 430, 230, 90, $accent);
textBox($image, "Администратор", 70, 680, 230, 90, $accent);
textBox($image, "Регистрация и вход\nПросмотр объявлений\nЗапись на соревнование\nПолучение уведомлений\nОтзыв после завершения", 440, 140, 430, 210, $common);
textBox($image, "Создание объявления\nРедактирование\nОтправка на модерацию\nУправление участниками\nЗавершение соревнования\nОтветы на отзывы", 440, 390, 430, 250, $common);
textBox($image, "Модерация объявлений\nОтправка на доработку\nБан пользователей\nПовышение роли\nПросмотр статистики", 440, 700, 430, 210, $common);
textBox($image, "Почта + уведомления на сайте\nДублируют ключевые события", 1040, 405, 400, 140, $accent);
arrow($image, 300, 225, 440, 245);
arrow($image, 300, 475, 440, 500);
arrow($image, 300, 725, 440, 785);
arrow($image, 870, 245, 1040, 430);
arrow($image, 870, 515, 1040, 475);
arrow($image, 870, 795, 1040, 520);
saveDiagram($image, $outputDir . '/use-case.png');

$image = baseImage();
titleText($image, 'Диаграмма деятельности: публикация объявления', $font);
$steps = [
    [90, 140, 'Организатор заполняет форму объявления'],
    [430, 140, 'Система валидирует данные и защищает ввод от XSS/SQLi'],
    [790, 140, 'Объявление получает статус pending_review'],
    [1140, 140, 'Админ проверяет объявление'],
    [1140, 390, "Решение админа:\nодобрить или на доработку"],
    [790, 390, 'Если одобрено: публикация и набор участников'],
    [430, 390, 'Если на доработку: комментарий и уведомление организатору'],
    [90, 390, 'Организатор исправляет и отправляет повторно'],
    [430, 650, 'Участники записываются, получают уведомления'],
    [790, 650, 'Организатор завершает соревнование и выставляет результаты'],
    [1140, 650, 'Участник оставляет один отзыв, организатор может ответить'],
];
foreach ($steps as [$x, $y, $text]) {
    textBox($image, $text, $x, $y, 300, 120, $common);
}
arrow($image, 390, 200, 430, 200);
arrow($image, 730, 200, 790, 200);
arrow($image, 1090, 200, 1140, 200);
arrow($image, 1290, 260, 1290, 390);
arrow($image, 1140, 450, 1090, 450);
arrow($image, 790, 450, 730, 450);
arrow($image, 430, 450, 390, 450);
arrow($image, 240, 390, 240, 260);
arrow($image, 1290, 510, 940, 650);
arrow($image, 730, 710, 790, 710);
arrow($image, 1090, 710, 1140, 710);
saveDiagram($image, $outputDir . '/activity.png');

$image = baseImage();
titleText($image, 'Диаграмма последовательности: запись и уведомления', $font);
$actors = [
    [90, 'Участник'],
    [360, 'Frontend Next.js'],
    [660, 'Laravel API'],
    [960, 'База данных'],
    [1240, 'Почта/уведомления'],
];
foreach ($actors as [$x, $name]) {
    textBox($image, $name, $x, 130, 220, 70, $accent);
    imageline($image, $x + 110, 210, $x + 110, 880, color($image, '#CBD5E1'));
}
$messages = [
    [200, 470, 'Нажимает "Записаться"'],
    [470, 770, 'POST /competitions/{id}/register'],
    [770, 1070, 'Проверка мест и прав'],
    [1070, 770, 'Создание participation'],
    [770, 1350, 'Создать уведомление организатору'],
    [1350, 770, 'Отправить письмо асинхронно'],
    [770, 470, 'JSON: участие создано'],
    [470, 200, 'Обновить карточку и счетчик'],
];
$y = 270;
foreach ($messages as [$x1, $x2, $label]) {
    arrow($image, $x1, $y, $x2, $y);
    drawWrappedText($image, $label, min($x1, $x2) + 20, $y - 32, abs($x2 - $x1) - 40, color($image, '#111827'), 16, $font);
    $y += 75;
}
textBox($image, "Та же схема используется для отзывов:\nотзыв сохраняется один раз, затем может редактироваться, а организатор получает уведомление и письмо.", 260, 820, 1080, 100, $danger);
saveDiagram($image, $outputDir . '/sequence.png');

echo "Diagrams generated in {$outputDir}\n";
