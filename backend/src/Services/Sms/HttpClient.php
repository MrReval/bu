<?php

declare(strict_types=1);

namespace Salon\Services\Sms;

final class HttpClient
{
    /**
     * @param array<string,string> $headers
     * @return array{status:int, body:string}
     */
    public static function request(string $method, string $url, array $headers = [], ?string $body = null): array
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $hdr = [];
        foreach ($headers as $k => $v) {
            $hdr[] = $k . ': ' . $v;
        }
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
        if (!empty($hdr)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $hdr);
        }
        $resp = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($resp === false) {
            $resp = 'curl_error: ' . curl_error($ch);
        }
        curl_close($ch);
        return ['status' => $status, 'body' => is_string($resp) ? $resp : ''];
    }
}
