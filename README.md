# bobux.gg
API for a rewards site - https://bobux.gg

# Requirements

MongoDB v4+

Redis

Node.JS v12+ (build tools may be required for some modules)

# .env file

```
HCAPTCHA_SECRET=
ROBUX_PER_DOLLAR=
```

# Nginx configuration

Proxy traffic from https://api.bobux.gg to http://localhost:5000

Make sure to use a self-signed certificate on the server.
Certbot can be used to obtain one.
