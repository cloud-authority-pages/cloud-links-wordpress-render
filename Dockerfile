FROM php:8.2-apache

# Install required PHP extensions
RUN apt-get update && apt-get install -y \
    libzip-dev unzip curl \
    && docker-php-ext-install zip \
    && rm -rf /var/lib/apt/lists/*

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Download WordPress
RUN curl -o /tmp/wordpress.tar.gz https://wordpress.org/latest.tar.gz \
    && tar -xzf /tmp/wordpress.tar.gz -C /var/www/html --strip-components=1 \
    && rm /tmp/wordpress.tar.gz

# Download SQLite plugin for WordPress
RUN curl -L -o /tmp/sqlite-db.zip https://downloads.wordpress.org/plugin/sqlite-database-integration.zip \
    && unzip /tmp/sqlite-db.zip -d /var/www/html/wp-content/plugins/ \
    && rm /tmp/sqlite-db.zip \
    && cp /var/www/html/wp-content/plugins/sqlite-database-integration/db.copy /var/www/html/wp-content/db.php

# Set permissions
RUN chown -R www-data:www-data /var/www/html

# WordPress config
COPY wp-config.php /var/www/html/wp-config.php

EXPOSE 80
