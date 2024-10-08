# avito_bot
```bash
docker compose -f docker-compose.yml up --build
```



## Запуск в режиме разработки

### **При первом запуске**
```bash
cp .env.example .env
```
 
```bash
docker compose -f ./_docker/dev/docker-compose.yml up --build
```

```bash
docker exec -it $(docker ps --filter "name=server" --format "{{.ID}}") ./node_modules/.bin/prisma db push
```


### **При последующих запусках**
```bash
docker compose -f ./_docker/dev/docker-compose.yml up --build