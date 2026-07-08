<?php

declare(strict_types=1);

namespace Salon\Services\Sms;

interface SmsDriver
{
    /**
     * ارسال پیامک متنی ساده.
     * @return array{ok:bool, response:string}
     */
    public function send(string $phone, string $message): array;

    /**
     * ارسال پیامک الگو (پترن) در صورت پشتیبانی.
     * @param array<string,string> $params
     * @return array{ok:bool, response:string}
     */
    public function sendPattern(string $phone, string $pattern, array $params): array;
}
