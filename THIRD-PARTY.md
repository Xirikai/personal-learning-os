# Сторонние компоненты LearningOS

Собственный код проекта распространяется по MIT. Сторонние компоненты сохраняют свои условия; MIT проекта их не заменяет. Точные установленные версии и адреса исходников перечислены в [licenses/DEPENDENCIES.json](licenses/DEPENDENCIES.json), тексты уведомлений — в папках licenses.

## JavaScript-зависимости

| Компонент | Версия | Лицензия |
| --- | --- | --- |
| @capacitor/android | 8.6.2 | MIT |
| @capacitor/app | 8.1.2 | MIT |
| @capacitor/core | 8.6.2 | MIT |
| @capacitor/filesystem | 8.1.5 | MIT |
| @capacitor/share | 8.0.3 | MIT |
| @capacitor/synapse | 1.0.4 | ISC |
| @img/colour | 1.1.0 | MIT |
| @img/sharp-win32-x64 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later |
| @next/env | 15.5.29 | MIT |
| @next/swc-win32-x64-msvc | 15.5.29 | MIT |
| @supabase/auth-js | 2.119.0 | MIT |
| @supabase/functions-js | 2.119.0 | MIT |
| @supabase/phoenix | 0.4.5 | MIT |
| @supabase/postgrest-js | 2.119.0 | MIT |
| @supabase/realtime-js | 2.119.0 | MIT |
| @supabase/storage-js | 2.119.0 | MIT |
| @supabase/supabase-js | 2.119.0 | MIT |
| @swc/helpers | 0.5.15 | Apache-2.0 |
| caniuse-lite | 1.0.30001819 | CC-BY-4.0 |
| client-only | 0.0.1 | MIT |
| iceberg-js | 0.8.1 | MIT |
| nanoid | 3.3.20 | MIT |
| next | 15.5.29 | MIT |
| picocolors | 1.1.1 | ISC |
| postcss | 8.5.23 | MIT |
| react | 19.3.1 | MIT |
| react-dom | 19.3.1 | MIT |
| scheduler | 0.28.0 | MIT |
| sharp | 0.35.5 | Apache-2.0 |
| source-map-js | 1.2.2 | BSD-3-Clause |
| styled-jsx | 5.1.6 | MIT |
| tslib | 2.8.1 | 0BSD |

## Оболочки и нативные компоненты

- Electron 45.4.1 — MIT, Chromium и его сторонние компоненты. Лицензионные файлы входят в поставку Electron и Windows-архив приложения. Исходники: https://github.com/electron/electron/tree/v45.4.1 .
- Android-оболочка использует Capacitor (MIT), AndroidX и Kotlin (Apache-2.0). Координаты зависимостей закреплены в android/variables.gradle и Android Gradle-файлах. Источники: https://github.com/ionic-team/capacitor , https://android.googlesource.com/platform/frameworks/support/ , https://github.com/JetBrains/kotlin .

Документация и лицензии взяты из установленных официальных пакетов. При обновлении зависимостей нужно обновлять уведомления и проверять условия соответствующей версии.
