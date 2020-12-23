# Ukaton Missions Web SDK

_A client-side JavaScript SDK for the Ukaton Missions smart insoles_

## 📚 Table of Contents

[⚙️ Setting up the SDK](#-setting-up-the-sdk)

[🔓 Enabling and Disabling Sensors](#-enabling-and-disabling-sensors)

[👂 Listening for Events](#-listening-for-events)

## ⚙️ Setting up the SDK

0. Make sure you have a Web Bluetooth-enabled device
   - **Chrome for Desktop [PREFERRED]**: enable Web Bluetooth by going to `chrome://flags/#enable-experimental-web-platform-features` and check `Experimental Web Platform features`
   - **iOS**: Use [this app](https://itunes.apple.com/us/app/webble/id1193531073?mt=8) to demo your web apps. Unfortunately iOS is [very negligent](https://github.com/WebBluetoothCG/web-bluetooth/blob/master/implementation-status.md) on various Web API's.
1. Save a copy of the [Web SDK](https://github.com/Ukaton-Inc/Missions-Web-SDK/blob/main/Missions.js)

1. In your HTML `<head></head>` element, insert the file in a script element:

```html
<script src="Missions.js"></script>
```

This will create global `Missions` class, whose instances contain 2 `Mission` instances (left and right)

3. Create a `Missions` instance:

```javascript
const missions = new Missions();
```

4. Connect to each mission individually using the `mission.side.connect()` method, which returns a `Promise`:

```javascript
missions.left.connect().then(() => {
  console.log("connected to the left insole!");
});
missions.right.connect().then(() => {
  console.log("connected to the right insole!");
});
```

You can also add an eventlistener for the `"connect"` event:

```javascript
missions.left.addEventListener("connect", event => {
  console.log("connected to the left insole!");
});
missions.left.connect();
```

## 🔓 Enabling and Disabling Sensors
To enable Pressure/Motion sensors, use `missions.side.configureSensors(options)`, with `true` or `false` to enable/disable:
```javascript
// enabling all sensors
missions.left.configureSensors({
  accelerometer: true,
  gyroscope: true,
  quaternion: true,
  pressure: true,
})
```
If connected, refreshing the page will disable all sensors to save battery life

## 📳 Haptics
To vibrate, pass an array of 8 vibration enumerations between 1 and 123, splitting a second of vibration into up to 8 distinct vibration patterns
```javascript
missions.left.vibrate(1, 2, 3, 4)
```
If you pass more than 8 it'll split it and use the first 8 vibrations, then use the rest of the array for the next second.

## 👂 Listening for Events

__Pressure Sensors__
```javascript
missions.left.addEventListener('pressure', event => {
  const {message} = event
  const {pressure, timestamp} = message
  pressure.forEach((sensor, index) => {
    console.log(`value for pressure sensor #${index}: ${sensor.value}`)
  })
})
```
_You can also access the mission's pressure it via `missions.left.pressure`_


__Acceleration Including Gravity (THREE.Vector3)__
```javascript
missions.left.addEventListener('accelerationIncludingGravity', event => {
  const {message} = event
})
```
_You can also access the mission's acceleration including gravity it via `missions.left.accelerationIncludingGravity`._


__Rotation Rate (THREE.Vector3)__
```javascript
missions.left.addEventListener('rotationRate', event => {
  const {message} = event
  const {rotationRate, timestamp} = message
  const {x, y, z} = rotationRate
  console.log(`received quaternion with x: ${x}, y: ${y}, and z: ${z}, at ${timestamp}ms`)
})
```
_You can also access the mission's rotation rate it via `missions.left.rotationRate`._


__Quaternion (THREE.Quaternion)__
```javascript
missions.left.addEventListener('quaternion', event => {
  const {message} = event
  const {quaternion, timestamp} = message
  const {w, x, y, z} = quaternion
  console.log(`received quaternion with w: ${w}, x: ${x}, y: ${y}, and z: ${z} at ${timestamp}ms`)
})
```
_You can also access the mission's quaternion it via `missions.left.quaternion`._

__Orientation (THREE.Euler - requires `quaternion` to be enabled)__
```javascript
missions.left.addEventListener('battery', event => {
  const {message} = event
  const {orientation, timestamp} = message
  const {y, x, z} = orientation
  console.log(`received euler with yaw: ${y}, pitch: ${x}, and roll: ${z}, at ${timestamp}ms`)
})
```
_You can also access the mission's orientation it via `missions.left.orientation`._

__Acceleration (requres `accelerometer` and `quaternion` to be enabled)__
```javascript
missions.left.addEventListener('acceleration', event => {
  const {message} = event
})
```
_You can also access the mission's acceleration it via `missions.left.acceleration`._


__Tap Detection (requires `pressure` to be enabled)__
```javascript
missions.left.addEventListener('tap', event => {
  const {message} = event
  const {isDoubleTap, timestamp} = message
  if (isDoubleTap)
    console.log(`received double tap at time ${timestamp}ms`)
  else
    console.log(`received single tap at time ${timestamp}ms`)
})
```

__Battery Level__
```javascript
missions.left.addEventListener('battery', event => {
  const {message} = event
  const {batteryLevel, voltage} = message
  console.log(`battery level: ${batteryLevel}%`)
  console.log(`voltage: ${voltage}v`)
})
```
_You can also access the mission's battery level and voltage it via `missions.left.batteryLevel` and `missions.left.voltage`._
