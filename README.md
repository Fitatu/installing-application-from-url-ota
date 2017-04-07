# Installing a non-market application from a url - OTA distributing

Hi, my name is Adrian Stanecki and together with my friends we are
developing [Fitatu](http://fitatu.com), an application for iOS and Android.

When you develop some application, sooner or later, the release day
comes on the horizon. When we assume the code looks good, both unit
and functional tests are passed, there are no bugs - the release is closer.
The last step is related with signing the application. Ok, our amazing app
is signed and distributed without bugs to the AppStore & GooglePlay.
Wohoo! The next natural step is collecting data and this is the most
interesting part of the process. Where should we collect the built
applications and how to organize them? These are questions to which I’m
gonna answer below.

A few weeks ago, while distributing Fitatu to the AppStore, I took a look at
the process a little more closely. Then I thought – what about creating a
custom tool for versioning these released (or not) apps? It sounds
interesting in my head. It would be most elegant when it could be served
under a single QR Code per version for iOS & Android. QR Codes are the
simplest way to give the possibility to scan (make a GET request) one
code with e.g. 20 mobile phones pararelly. Today, I am going to show you
how to distribute apps over-the-air (OTA) for the iOS platform. This
solution means distributing a non-market IPA application without
TestFlight or the official App Store.

On the web, there are few tools which build and store given apps on their
servers. In my humble opinion, learning something new and building it
from scratch is worth more, isn’t it? My solution is based on:

* [QR Code JS](https://github.com/davidshimjs/qrcodejs)
* [Node.js](https://nodejs.org)
* [Express.js](https://expressjs.com)
* own correctly signed ipa file with your device added to the
Provisioning Profile. I assume you have signed your ipa file, and are
familiar with [developer apple](http://developer.apple.com)

Firstly, let’s draw a basic scheme of my solution and analyze its general
architecture

![basic scheme](https://github.com/Fitatu/installing-application-from-url-ota/blob/master/images/1.png)

What do you see on the scheme? We probably need the following:

* A front client application 
* A server for sending the requested Fitatu.ipa file
* A signed app

At the first look it is just a scan event on a mobile phone, sending a GET
request to the server and downloading the Fitatu.ipa file. Is that right?

![basic scheme](https://github.com/Fitatu/installing-application-from-url-ota/blob/master/images/2.png)

I decided to write the server side in Express.js:

```javascript
var app = require('express')();

function onListeningSuccess () {
   console.log('Server starting: SUCCESS') ;
}

app.get('/', function (req , res) {
   res.send('Server listening...');
});

app.get('/fitatu.ipa',function (req, res) {
   res.setHeader("Content-Type", 'application/octet-stream');
   res.sendFile(__dirname + '/apps/fitatu.ipa') ;
});

app.listen(3000, onListeningSuccess);
```

Then, run server from the root directory by typing in cmd:

```
> node server.js
```

Assuming the server is started correctly under ``192.168.0.87:3000``, the client side takes into account this IPv4
address:

```html
<!DOCTYPE html>
<html lang= "en">
<head>
   <meta charset= "UTF-8">
   <meta name= "viewport"
         content= "width=device-width">
   <title> Fitatu </title>
</head>
<body>
   <p>
      Scan code to install Fitatu
   </p>
   <div class= "qrCode" ></div>
   <script src= "qrcode.min.js" ></script>
   <script>
      var qrCodeElement = document.querySelector(".qrCode");
      var qrCodeProperties = {width: 200, height: 200};
      var qrCodeUrl = 'http://192.168.0.87:3000/fitatu.ipa';
      new QRCode(qrCodeElement , qrCodeProperties)
            .makeCode(qrCodeUrl);
   </script>
</body>
```
![basic scheme](https://github.com/Fitatu/installing-application-from-url-ota/blob/master/images/3.png)

Please note, server responds without checking Fitatu’s version. It just
sends the same file version on each request. It seems to be really simple,
but when scanning you should see the following screen:

![basic scheme](https://github.com/Fitatu/installing-application-from-url-ota/blob/master/images/4.png)

Currently each iOS device will not install our application as typical
application installed from AppStore. It will be downloaded as a file without
executing an installation process. To help our iOS device in recognizing a
given file, we have to implement a little different action behind the QR
Code. Actually, query which is not able to install apps is:

```
http://192.168.0.87:3000/fitatu.ipa
```

On iOS, the whole URL has to be prefixed with the action that we want to
perform. We are not allowed to just install an ipa file directly. We should
use the custom Apple protocol “itms-services” pointing to a manifest,
which will be created:

```
itms-services://?action=download-manifest&amp;url=http://192.168.0.87:3000/fitatu.ipa
```

Hm, looks better so check this out. Scan the code again. What is the result?

![basic scheme](https://github.com/Fitatu/installing-application-from-url-ota/blob/master/images/5.png)

Here is the biggest difference between Android and iOS. As described
above, the link behind the code points to a manifest. Client on the front
has to receive a correctly defined manifest.plist file. Here is a sample:

```xml 
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
"http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
   <dict>
      <key>items</key>
      <array>
         <dict>
            <key>assets</key>
            <array>
               <dict>
                  <key>kind</key>
                  <string>software-package</string>
                  <key>url</key>
                  <string>URL</string>
               </dict>
            </array>
            <key>metadata</key>
            <dict>
               <key>bundle-identifier</key>
               <string>your.key.com</string>
               <key>bundle-version</key>
               <string>1.0.0</string>
               <key>kind</key>
               <string>software</string>
               <key>title</key>
               <string>Your App</string>
            </dict>
         </dict>
      </array>
   </dict>
</plist>
```

As you see, the query is just prefixed by this action. Now you know we
need to receive manifest.plist . Of course we can ask api for manifest.plist
by URL based on /fitatu.ipa , but isn’t it readable? Let’s write it more
human friendly and change to:

```html 
itms-services://?
      action=download-manifest&amp;
      url=http://localhost:3000/manifest.plist
```

Then, handling /manifest.plist on the server side is also required:

```javascript
app.get('/manifest.plist', function (req, res) {
   res.setHeader("Content-Type", 'text/plain');
}) ;
```

Current scheme:

![basic scheme](https://github.com/Fitatu/installing-application-from-url-ota/blob/master/images/6.png)

There is also one thing that is not talked. Our app should be hosted on an
HTTPS server. [Ngrok](https://ngrok.com) comes with help. It is a free solution based on
secure tunneling to localhost. A really nice tool. It
gives our local server a URL with SSL. When downloaded & installed, type
from cmd:

```
> Ngrok.exe http 3000
```

Now all requests to localhost have to be changed to the url generated by
Ngrok, like

![basic scheme](https://github.com/Fitatu/installing-application-from-url-ota/blob/master/images/7.png)

As we see, all requests sent to ngrok’s URL will be sent to our server.
Here, _https://eca56476.ngrok.com_ will be our local server with https. So
QRCode on the front side should also contain this change:

```html
itms-services://?action=download-manifest&amp;url=https://eca56476.ngrok.com/manifest.plist
```

…and URL in manifest.plist also must be based on ngrok’s url with
fitatu.ipa query

```xml
<key>url</key>
<string>
   https://eca56476.ngrok.com/fitatu.ipa
</string>
```

Now installing an ipa file should work on your phone.

![basic scheme](https://github.com/Fitatu/installing-application-from-url-ota/blob/master/images/8.png)

Today we saw how installing an ipa file on Apple platform works. I hope
my schemata and manner of interpolation were simpler than apple’s rules
;) What about installing Fitatu.ipa on iOS and Fitatu.apk on Android from
one url? Currently implemented code can be a good base for it.

You can find all of the code for this solution on [GitHub](https://github.com/Fitatu/installing-application-from-url-ota)




