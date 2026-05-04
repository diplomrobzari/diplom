<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class CyrillicOnly implements ValidationRule
{
public function passes($attribute, $value): bool
    {
        return preg_match(
            '/^[А-ЯЁ][а-яё]+(?:[ -][А-ЯЁ][а-яё]+)*$/u',
            $value
        );
    }

    public function message(): string
    {
        return 'Поле :attribute должно быть заполнено только на русском языке';
    }    

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        //
    }
}
