# Проверка и сборка Personal Learning OS

1. Скопировать или клонировать репозиторий в отдельную папку.
2. Установить Node.js 22+ и выполнить `npm ci`.
3. Запустить `npm test` и `npm run typecheck`.
4. Для Windows установить runtime командой `npm run setup`, затем выполнить `npm run desktop:build`.
5. Готовые файлы находятся в `release/`.

Android требует JDK 21, SDK 36 и принятых лицензий Android SDK. После `npm run android:sync` используйте Gradle wrapper репозитория. Debug APK не является сборкой для Google Play. Коммерческие ключи и пароли подписи в исходники не включаются.

Рабочие инструменты тестового окружения автора не входят в репозиторий; абсолютные пути к его SDK и профилю не нужны.

Документация: [Electron Builder](https://www.electron.build/), [Capacitor Android](https://capacitorjs.com/docs/android), [Next.js](https://nextjs.org/docs).
