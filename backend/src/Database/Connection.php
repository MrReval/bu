<?php

declare(strict_types=1);

namespace Salon\Database;

use PDO;
use Salon\Config;

final class Connection
{
    private static ?PDO $pdo = null;

    public static function get(): PDO
    {
        if (self::$pdo === null) {
            self::$pdo = new PDO(
                Config::dbDsn(),
                Config::dbUser(),
                Config::dbPassword(),
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
        }
        return self::$pdo;
    }

    public static function reset(): void
    {
        self::$pdo = null;
    }
}
