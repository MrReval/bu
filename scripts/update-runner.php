<?php

declare(strict_types=1);

/**
 * Update runner (detached).
 * Triggered by admin API. Writes status + log into backend/storage/update/.
 */

$root = dirname(__DIR__);
$backend = $root . '/backend';

require $backend . '/bootstrap.php';

Salon\Config::load($backend . '/.env');

$updateDir = $backend . '/storage/update';
@mkdir($updateDir, 0755, true);

$statusPath = $updateDir . '/status.json';
$logPath = $updateDir . '/update.log';

function write_status(string $path, array $data): void {
    $data['updated_at'] = date('c');
    file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

write_status($statusPath, [
    'running' => true,
    'started_at' => date('c'),
    'finished_at' => null,
    'exit_code' => null,
]);

@file_put_contents($logPath, "=== Update started at " . date('c') . " ===\n", FILE_APPEND);

// Run commands and append output to log
$commands = [
    'git pull',
    'cd frontend && npm install',
    'cd frontend && npm run build',
];

$exitCode = 0;
foreach ($commands as $cmd) {
    @file_put_contents($logPath, "\n$ $cmd\n", FILE_APPEND);
    $descriptorspec = [
        1 => ['file', $logPath, 'a'],
        2 => ['file', $logPath, 'a'],
    ];
    $proc = proc_open($cmd, $descriptorspec, $pipes, $root);
    if (!is_resource($proc)) {
        $exitCode = 1;
        @file_put_contents($logPath, "Failed to start command.\n", FILE_APPEND);
        break;
    }
    $code = proc_close($proc);
    if ($code !== 0) {
        $exitCode = $code;
        break;
    }
}

@file_put_contents($logPath, "\n=== Update finished at " . date('c') . " (exit=$exitCode) ===\n", FILE_APPEND);

write_status($statusPath, [
    'running' => false,
    'started_at' => json_decode((string) @file_get_contents($statusPath), true)['started_at'] ?? null,
    'finished_at' => date('c'),
    'exit_code' => $exitCode,
]);

exit($exitCode);

