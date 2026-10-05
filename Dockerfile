FROM node:20-alpine

# Install Chromium & dependencies untuk Puppeteer (WA Bot)
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn

# Bypass Chromium Puppeteer download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Buat folder uploads jika belum ada
RUN mkdir -p uploads

EXPOSE 3000

# Start script akan dipass dari docker-compose
CMD ["npm", "start"]