# Varnish Visualizer 3D

Visualize cache hits/misses in a Varnish cache. It uses VCL and two VMODs to do this.

Required VMODs (if not using the varnishncsa version):
- RabbitMQ: https://github.com/Lallassu/libvmod-rmq.git
- GeoIP(with lat/long support): https://github.com/Lallassu/libvmod-geoip.git

Developed for Varnish 5.2.x and not for production!

Required a default installation of RabbitMQ and Varnish. The queue for RabbitMQ has been configured with a TTL of 3 seconds.

It uses a nodejs server as a backend that sends out data to clients using socket.io. To run the server:
    nodejs server.js

## Demo
Using this on my http://webgl.nu site and it can be seen by opening up your browser on:
    http://varnish.webgl.nu
and then go to http://webgl.nu too see traffic if no one else is currently surfing the site.

## VCL Used for varnishncsa
    vcl 4.0;
    
    backend default {
        .host = "127.0.0.1";
        .port = "8888";
    }
    
    sub vcl_recv {
    	unset req.http.x-cache;
    	unset req.http.Cookie;
    }
    
    sub vcl_hit {
    	set req.http.x-cache = client.ip+" hit";
    }
    
    sub vcl_miss {
    	set req.http.x-cache = client.ip+" miss";
    }

## VCL For RabbitMQ VMOD
    vcl 4.0;
    import geoip;
    import rmq;
    
    backend default {
        .host = "127.0.0.1";
        .port = "8888";
    }
    
    sub vcl_init {
            rmq.init("localhost", 5672, "test", "guest", "guest");
    }
    
    sub vcl_recv {
    	unset req.http.Cookie;
    }
    
    sub vcl_hit {
    	rmq.send(client.ip, geoip.country_name(client.ip), geoip.latlong(client.ip), "hit");
    }
    
    sub vcl_pass {
    	rmq.send(client.ip, geoip.country_name(client.ip), geoip.latlong(client.ip), "miss");
    }

## Screenshot
![Preview](./preview.png)


## License
MIT

