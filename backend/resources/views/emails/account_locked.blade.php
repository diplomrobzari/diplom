<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Аккаунт заблокирован</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc3545;">Аккаунт заблокирован</h2>
        
        <p>Здравствуйте, <strong>{{ $user->name }}</strong>!</p>
        
        <p>Ваш аккаунт был временно заблокирован в связи с множественными неудачными попытками входа.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Причина блокировки:</strong> 5 неудачных попыток ввода пароля</p>
            <p><strong>Длительность блокировки:</strong> {{ $lockDuration }} минут</p>
            <p><strong>Время блокировки:</strong> {{ now()->format('d.m.Y H:i') }}</p>
        </div>
        
        <p>Если это были вы, пожалуйста, дождитесь окончания блокировки и попробуйте войти снова.</p>
        
        <p><strong>Если это были не вы,</strong> рекомендуем немедленно сменить пароль после разблокировки аккаунта и проверить безопасность вашей учетной записи.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        
        <p style="font-size: 12px; color: #666;">
            Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.
        </p>
    </div>
</body>
</html>
