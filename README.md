# loopa

## Запуск

Нужен Node.js 24. Если установлен [mise](https://mise.jdx.dev/), нужная версия ставится из `mise.toml`:

```sh
mise install
```

Клиент живёт в папке `web/`:

```sh
cd web
npm install
npm run dev
```

Приложение откроется на http://127.0.0.1:5173.

### Другие команды

Выполняются в папке `web/`.

| Команда | Что делает |
|---|---|
| `npm run test:unit` | unit-тесты в режиме наблюдения (`npm run test:unit -- --run` — один прогон) |
| `npm run type-check` | проверка типов |
| `npm run lint` | линтеры с автоисправлением |
| `npm run format` | форматирование кода |
| `npm run build` | проверка типов и сборка в `web/dist` |
| `npm run preview` | просмотр собранной версии |
