/* global THREE */

const { EventDispatcher, Vector3, Euler } = THREE;

class Mission {
  constructor(isRight = true) {
    this.isRight = isRight;

    // CONFIGURATION
    this.CONFIGURATION_SERVICE_UUID = "0bb6d9ac-1012-448b-8485-495bea5238a7";
    this.CONFIGURATION_CHARACTERISTIC_UUID =
      "5a6256f0-fc1c-42b5-ba7b-6585f39cfc7e";
    this.BATTERY_LEVEL_CHARACTERISTIC_UUID =
      "ba8a923c-ac7a-4880-9520-f1cbf127a518";

    // IMU
    this.IMU_DATA_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";

    this.ACCELEROMETER_DATA_CHARACTERISTIC_UUID =
      "5cf06fe8-ed01-4e1a-969e-126bc70b0950";
    this.GYROSCOPE_DATA_CHARACTERISTIC_UUID =
      "3938f998-070e-4bd7-a15f-1925e7afef9f";
    this.QUATERNION_DATA_CHARACTERISTIC_UUID =
      "96e8a211-f97f-4349-9a31-0437ecd43cdd";

    // PRESSURE
    this.pressure = [];
    Object.assign(this.pressure, {
      sum: 0,
      centerOfMass: { x: 0, y: 0 },
      timestamp: 0
    });

    // MOTION
    this._accelerationIncludingGravity = new THREE.Vector3();
    this.accelerationIncludingGravity = new THREE.Vector3();
    this.accelerationIncludingGravityTimestamp = 0;

    this._rotationRate = new THREE.Vector3();
    this.rotationRate = new THREE.Vector3();
    this.rotationRateEuler = new THREE.Euler(0, 0, "XYZ");
    this.rotationRateTimestamp = 0;

    this._magnetometer = new THREE.Vector3();
    this.magnetometer = new THREE.Vector3();
    this.magnetometerTimestamp = 0;

    this._correctionEuler = new THREE.Euler(
      Math.PI / 2,
      ((this.isRight ? -1 : 1) * Math.PI) / 2,
      0,
      "XYZ"
    );
    this._correctionQuaternion = new THREE.Quaternion();
    this._correctionQuaternion.setFromEuler(this._correctionEuler);
    this._quaternion = new THREE.Quaternion();
    this.quaternion = new THREE.Quaternion();
    this.quaternionTimestamp = 0;

    this._gravity = new THREE.Vector3();
    this.gravity = new THREE.Vector3();

    this._acceleration = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.accelerationTimestamp = 0;

    this._orientation = new THREE.Euler();
    this.orientation = new THREE.Euler();
    this.orientationTimestamp = 0;

    // PRESSURE/HAPTICS/TAP
    this.PRESSURE_HAPTICS_TAP_SERVICE_UUID =
      "31408399-730b-4d53-911e-993cd531e96f";
    this.HAPTICS_CHARACTERISTIC_UUID = "ff227c5f-bfef-4db4-8ce0-e4ef8e520973";
    this.PRESSURE_DATA_CHARACTERISTIC_UUID =
      "5d11a41a-8479-47cd-bd96-8e04dc6e98a2";
    this.TAP_CHARACTERISTIC_UUID = "96337137-88a9-45a7-86dd-72bd25eb44e1";

    this._vibrationStack = [];
  }

  get enumeration() {
    return this.constructor.enumeration;
  }

  // CONNECTION
  get isConnected() {
    return this.device && this.device.gatt.connected;
  }
  connect() {
    if (this.isConnected) {
      return Promise.resolve();
    } else {
      return navigator.bluetooth
        .requestDevice({
          filters: [
            {
              services: [
                this.CONFIGURATION_SERVICE_UUID,
                this.IMU_DATA_SERVICE_UUID,
                this.PRESSURE_HAPTICS_TAP_SERVICE_UUID
              ]
            }
          ]
          //acceptAllDevices: true,
        })
        .then(device => {
          console.log("got device");
          this.device = device;
          this.device.addEventListener(
            "gattserverdisconnected",
            this.onGattServerDisconnected.bind(this)
          );
          return device.gatt.connect();
        })
        .then(server => {
          console.log("got server");
          this.server = server;
          return this.server.getPrimaryService(this.CONFIGURATION_SERVICE_UUID);
        })
        .then(configurationService => {
          console.log("got config service");
          this.configurationService = configurationService;
          return this.configurationService.getCharacteristic(
            this.CONFIGURATION_CHARACTERISTIC_UUID
          );
        })
        .then(configurationCharacteristic => {
          console.log("got config characteristic");
          this.configurationCharacteristic = configurationCharacteristic;
          this.configurationCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this.onConfigurationCharacteristicValueChanged.bind(this)
          );
          return this.configurationCharacteristic
            .startNotifications()
            .catch(e => console.log(e));
        })
        .then(() => {
          console.log("started config notifications");
          return this.configurationService.getCharacteristic(
            this.BATTERY_LEVEL_CHARACTERISTIC_UUID
          );
        })
        .then(batteryCharacteristic => {
          console.log("get battery characteristic");
          this.batteryCharacteristic = batteryCharacteristic;
          this.batteryCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this.onBatteryCharacteristicValueChanged.bind(this)
          );
          return this.batteryCharacteristic
            .startNotifications()
            .catch(e => console.log(e));
        })
        .then(() => {
          console.log("started battery notifications");
          return this.server
            .getPrimaryService(this.IMU_DATA_SERVICE_UUID)
            .catch(e => console.error(e));
        })
        .then(imuDataService => {
          console.log("got imu data service");
          this.imuDataService = imuDataService;
          return this.imuDataService.getCharacteristic(
            this.ACCELEROMETER_DATA_CHARACTERISTIC_UUID
          );
        })
        .then(accelerometerDataCharacteristic => {
          console.log("got accelerometer data characteristic");
          this.accelerometerDataCharacteristic = accelerometerDataCharacteristic;
          this.accelerometerDataCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this.onAccelerometerDataCharacteristicValueChanged.bind(this)
          );
          return this.accelerometerDataCharacteristic
            .startNotifications()
            .catch(e => console.log(e));
        })
        .then(() => {
          console.log("started accelerometer notifications");
          return this.imuDataService.getCharacteristic(
            this.GYROSCOPE_DATA_CHARACTERISTIC_UUID
          );
        })
        .then(gyroscopeDataCharacteristic => {
          console.log("got gyroscope data characteristic");
          this.gyroscopeDataCharacteristic = gyroscopeDataCharacteristic;
          this.gyroscopeDataCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this.onGyroscopeDataCharacteristicValueChanged.bind(this)
          );
          return this.gyroscopeDataCharacteristic
            .startNotifications()
            .catch(e => console.log(e));
        })
        .then(() => {
          console.log("started gyroscope notifications");
          return this.imuDataService.getCharacteristic(
            this.QUATERNION_DATA_CHARACTERISTIC_UUID
          );
        })
        .then(quaternionDataCharacteristic => {
          console.log("got quaternion data characteristic");
          this.quaternionDataCharacteristic = quaternionDataCharacteristic;
          this.quaternionDataCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this.onQuaternionDataCharacteristicValueChanged.bind(this)
          );
          return this.quaternionDataCharacteristic
            .startNotifications()
            .catch(e => console.log(e));
        })
        .then(() => {
          console.log("started quaternion notifications");
          return this.server
            .getPrimaryService(this.PRESSURE_HAPTICS_TAP_SERVICE_UUID)
            .catch(e => console.log(e));
        })
        .then(pressureHapticsTapService => {
          // PRESSURE/HAPTICS/TAP
          console.log("got pressure/haptics/tap service");
          this.pressureHapticsTapService = pressureHapticsTapService;
          return this.pressureHapticsTapService
            .getCharacteristic(this.HAPTICS_CHARACTERISTIC_UUID)
            .catch(e => console.log(e));
        })
        .then(hapticsCharacteristic => {
          console.log("got haptics characteristic");
          this.hapticsCharacteristic = hapticsCharacteristic;
          return this.pressureHapticsTapService
            .getCharacteristic(this.PRESSURE_DATA_CHARACTERISTIC_UUID)
            .catch(e => console.log(e));
        })
        .then(pressureDataCharacteristic => {
          console.log("got pressure data characteristic");
          this.pressureDataCharacteristic = pressureDataCharacteristic;
          this.pressureDataCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this.onPressureDataCharacteristicValueChanged.bind(this)
          );
          return this.pressureDataCharacteristic
            .startNotifications()
            .catch(e => console.log(e));
        })
        .then(() => {
          console.log("started pressure notifications");
          return this.pressureHapticsTapService
            .getCharacteristic(this.TAP_CHARACTERISTIC_UUID)
            .catch(e => console.log(e));
        })
        .then(tapCharacteristic => {
          console.log("got tap characteristic");
          this.tapCharacteristic = tapCharacteristic;
          this.tapCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this.onTapCharacteristicValueChanged.bind(this)
          );
          return this.tapCharacteristic
            .startNotifications()
            .catch(e => console.log(e));
        })
        .then(() => {
          console.log("started tap notifications");
        })
        .then(() => {
          console.log("done");
          this.dispatchEvent({ type: "connect" });
        });
    }
  }

  onGattServerDisconnected(event) {
    console.log("gettserverdisconnected");
    this.device.gatt.connect();
  }

  // CHARACTERISIC VALUE CHANGED
  onConfigurationCharacteristicValueChanged(event) {
    console.log("configuration changed", event.target.value.buffer);
  }

  onAccelerometerDataCharacteristicValueChanged(event) {
    //console.log('acceleromter data')

    const dataView = event.target.value;

    let offset = 0;

    const _accelerationIncludingGravity = new THREE.Vector3(
      dataView.getFloat32(offset, true),
      dataView.getFloat32(offset + 4, true),
      dataView.getFloat32(offset + 8, true)
    );
    this._accelerationIncludingGravity.copy(_accelerationIncludingGravity);

    const accelerationIncludingGravity = new THREE.Vector3(
      //_accelerationIncludingGravity.x,
      //-_accelerationIncludingGravity.z,
      //_accelerationIncludingGravity.y
      -_accelerationIncludingGravity.z * (this.isRight ? -1 : 1),
      _accelerationIncludingGravity.y,
      -_accelerationIncludingGravity.x * (this.isRight ? -1 : 1)
    );
    this.accelerationIncludingGravity.copy(accelerationIncludingGravity);

    offset += 12;

    const timestamp = dataView.getUint32(offset, true);

    // FIX!
    const _acceleration = accelerationIncludingGravity.clone();
    let gravity = new THREE.Vector3(0, -1, 0);
    {
      const { w, x, y, z } = this._quaternion;
      gravity.set(
        (w ** 2 - x ** 2 - y ** 2 + z ** 2) * (this.isRight ? 1 : -1),
        2 * (w * x + y * z),
        2 * (x * z - w * y) * (this.isRight ? 1 : -1)
      );
      this.gravity.copy(gravity);
      _acceleration.sub(this.gravity);
    }
    const acceleration = new THREE.Vector3(
      _acceleration.x,
      _acceleration.y,
      _acceleration.z
    );
    this.acceleration.copy(acceleration);

    this.dispatchEvent({
      type: "accelerationIncludingGravity",
      message: {
        accelerationIncludingGravity,
        _accelerationIncludingGravity,
        timestamp
      }
    });

    this.dispatchEvent({
      type: "acceleration",
      message: { acceleration, _acceleration, timestamp }
    });

    this.dispatchEvent({
      type: "gravity",
      message: { gravity, timestamp }
    });

    if (this.isDispatchingMotionEvents) {
      Object.assign(this.getMotionEventByTimestamp(timestamp), {
        accelerationIncludingGravity,
        _accelerationIncludingGravity,
        acceleration,
        _acceleration
      });
    }
  }

  degreesToRadians(degrees) {
    return (degrees / 180) * Math.PI;
  }
  radiansToDegrees(radians) {
    return (radians / Math.PI) * 180;
  }
  onGyroscopeDataCharacteristicValueChanged(event) {
    //console.log('gyroscope data')

    const dataView = event.target.value;

    let offset = 0;

    const _rotationRate = new THREE.Vector3(
      dataView.getFloat32(offset, true),
      dataView.getFloat32(offset + 4, true),
      dataView.getFloat32(offset + 8, true)
    );
    this._rotationRate.copy(_rotationRate);

    const rotationRate = new THREE.Vector3(
      //_rotationRate.x,
      //_rotationRate.z,
      //-_rotationRate.y
      _rotationRate.z * (this.isRight ? -1 : 1),
      -_rotationRate.y,
      _rotationRate.x * (this.isRight ? -1 : 1)
    );
    this.rotationRate.copy(rotationRate);

    const rotationRateEuler = new THREE.Euler(
      this.degreesToRadians(rotationRate.x), // x
      this.degreesToRadians(rotationRate.y), // y
      this.degreesToRadians(rotationRate.z) // z
    );
    this.rotationRateEuler.copy(rotationRateEuler);

    offset += 12;

    const timestamp = dataView.getUint32(offset, true);

    this.dispatchEvent({
      type: "rotationRate",
      message: { rotationRate, timestamp }
    });

    if (this.isDispatchingMotionEvents) {
      Object.assign(this.getMotionEventByTimestamp(timestamp), {
        rotationRate
      });
    }
  }

  onQuaternionDataCharacteristicValueChanged(event) {
    //console.log('quaternion data')

    const dataView = event.target.value;

    let offset = 0;

    const _quaternion = new THREE.Quaternion(
      dataView.getFloat32(offset + 4, true),
      dataView.getFloat32(offset + 8, true),
      dataView.getFloat32(offset + 12, true),
      dataView.getFloat32(offset, true)
    );
    this._quaternion.copy(_quaternion);

    const quaternion = new THREE.Quaternion(
      -_quaternion.x,
      -_quaternion.z,
      _quaternion.y,
      -_quaternion.w
    );
    quaternion.multiply(this._correctionQuaternion);
    this.quaternion.copy(quaternion);

    offset += 16;

    const _orientation = new THREE.Euler();
    _orientation.setFromQuaternion(_quaternion);
    this._orientation.copy(_orientation);

    const orientation = new THREE.Euler();
    orientation.order = "YXZ";
    orientation.setFromQuaternion(quaternion);
    this.orientation.copy(orientation);

    const timestamp = dataView.getUint32(offset, true);

    this.dispatchEvent({
      type: "quaternion",
      message: { quaternion, _quaternion, timestamp }
    });
    this.dispatchEvent({
      type: "orientation",
      message: { orientation, _orientation, timestamp }
    });

    if (this.isDispatchingMotionEvents) {
      Object.assign(this.getMotionEventByTimestamp(timestamp), {
        quaternion,
        _quaternion
      });
    }
  }

  onPressureDataCharacteristicValueChanged(event) {
    const dataView = event.target.value;

    let offset = 0;

    let sum = 0;

    const numberOfPressureValues = dataView.byteLength;
    const pressure = [];
    for (let index = 0; index < 16; index++) {
      const value = dataView.getUint8(index + offset, true);
      sum += value;

      const { x, y } = this.constructor.getPressurePosition(
        index,
        this.isRight
      );
      pressure[index] = { x, y, value };
    }
    pressure.sum = sum;

    pressure.centerOfMass = pressure.reduce(
      (centerOfMass, sensor) => {
        const { value } = sensor;
        const weight = value / sum || 0;
        sensor.weight = weight;

        const { x, y } = sensor;
        centerOfMass.x += x * weight;
        centerOfMass.y += y * weight;

        return centerOfMass;
      },
      { x: 0, y: 0 }
    );

    offset += 16;

    const timestamp = dataView.getUint32(offset, true);
    pressure.timestamp = timestamp;

    this.pressure = pressure;

    this.dispatchEvent({
      type: "pressure",
      message: { pressure, timestamp }
    });
  }

  onTapCharacteristicValueChanged(event) {
    const dataView = event.target.value;

    const isSingleTap = dataView.getUint8(0) !== 1;
    const isDoubleTap = dataView.getUint8(1) !== 1;
    const timestamp = dataView.getUint32(2, true);

    this.dispatchEvent({
      type: "tap",
      message: {
        timestamp,
        isDoubleTap
      }
    });
  }

  // ENABLE/DISABLE
  configureSensors(options = {}) {
    if (this.isConnected) {
      const dataView =
        this.configurationCharacteristic.value ||
        new DataView(new Uint8Array([0]).buffer);

      let byte = dataView && dataView.byteLength ? dataView.getUint8(0) : 0;

      if (byte == 1) byte = 0;

      for (const key in options) {
        let enabled = options[key] || false;

        switch (key) {
          case "pressure":
            if (enabled) byte |= this.enumeration.PRESSURE;
            else byte &= this.enumeration.PRESSURE ^ this.enumeration.ALL;
            break;

          case "accelerometer":
            if (enabled) byte |= this.enumeration.ACCELEROMETER;
            else byte &= this.enumeration.ACCELEROMETER ^ this.enumeration.ALL;
            break;
          case "gyroscope":
            if (enabled) byte |= this.enumeration.GYROSCOPE;
            else byte &= this.enumeration.GYROSCOPE ^ this.enumeration.ALL;
            break;
          case "quaternion":
            if (enabled) byte |= this.enumeration.QUATERNION;
            else byte &= this.enumeration.QUATERNION ^ this.enumeration.ALL;
            break;

          default:
            break;
        }
      }

      byte = byte || this.enumeration.NONE;

      if (options.motion == 0 && options.pressure == 0) {
        byte = this.enumeration.NONE;
      }

      console.log(byte.toString(2));

      dataView.setUint8(0, byte);

      return this.configurationCharacteristic.writeValue(dataView);
    } else {
      return Promise.resolve();
    }
  }

  // HAPTICS
  vibrate(...vibrations) {
    if (this.isConnected) {
      if (
        !isNaN(this._vibrateTimestamp) &&
        Date.now() - this._vibrateTimestamp < 1000
      ) {
        const vibrationObject = { vibrations };
        return new Promise(resolve => {
          Object.assign(vibrationObject, { resolve });
          this._vibrationStack.unshift(vibrationObject);
        });
      } else {
        this._vibrateTimestamp = Date.now();

        vibrations = vibrations.map(vibration =>
          Math.max(1, Math.min(123, vibration))
        );
        const value = new Uint8Array(vibrations.slice(0, 8));

        return this.hapticsCharacteristic.writeValue(value).then(() => {
          window.setTimeout(() => {
            if (vibrations.length > 8) {
              return this.vibrate(...vibrations.slice(8));
            } else {
              if (this._vibrationStack.length) {
                const { vibrations, resolve } = this._vibrationStack.pop();
                return this.vibrate(...vibrations).then(() => resolve());
              }
            }
          }, 1000);
        });
      }
    } else {
      return Promise.resolve();
    }
  }

  onBatteryCharacteristicValueChanged(event) {
    const dataView = event.target.value;
    this.voltage = dataView.getFloat32(0, true);
    this.batteryLevel = this.voltage / 3.3;
    this.dispatchEvent({
      type: "battery",
      message: {
        batteryLevel: this.batteryLevel,
        voltage: this.voltage
      }
    });
  }
}
Object.assign(Mission.prototype, EventDispatcher.prototype);
Object.assign(Mission, {
  enumeration: {
    MOTION: 0b1110 << 4,
    QUATERNION: 0b1000 << 4,
    GYROSCOPE: 0b0100 << 4,
    ROTATIONRATE: 0b0100 << 4,
    ACCELEROMETER: 0b0010 << 4,
    ACCELERATIONINCLUDINGGRAVITY: 0b0010 << 4,

    PRESSURE: 0b0001 << 4,
    TAP: 0b0001 << 4,

    NONE: 0b1,
    ALL: 0b1111 << 4
  },
  pressurePositions: [
    [18.55, 242.1], // 0
    [43.5, 242.0], // 1

    [43.3, 200.6], // 2
    [43.3, 177.7], // 3
    [18.0, 200.0], // 4
    [18.0, 177.0], // 5

    [17.8, 130.5], // 6
    [19.2, 102.8], // 7
    [20.3, 71.9], // 8
    [33.1, 42.15], // 9
    [44.11, 64.8], // 10
    [41.44, 90.8], // 11
    [59.55, 32.3], // 12
    [69.5, 55.5], // 13
    [63.8, 81.1], // 14
    [48.3, 119.7] // 15

    /*
    Left Insole
       9 12
     8 10 13
     7 11 14
     6  15
    
     5 3
     4 2
    
     0 1
    */

    /*
    Right Insole
       8 11
      7 10 12
       6 9 14
        15 13
    
         5 4
         3 2
    
         1 0
    */
  ].map(([x, y]) => {
    x /= 93.257; // width (mm)
    y /= 265.069; // height (mm)
    return { x, y };
  }),

  rightToLeftPermutation: [
    0, // 0
    1, // 1
    4, // 2
    2, // 3
    5, // 4
    3, // 5
    14, // 6
    13, // 7
    12, // 8
    11, // 9
    10, // 10
    9, // 11
    8, // 12
    6, // 13
    7, // 14
    15 // 15
  ],

  getPressurePosition(index, isRight = false) {
    if (isRight) {
      index = this.rightToLeftPermutation[index];
    }
    let { x, y } = this.pressurePositions[index];
    if (isRight) {
      x = 1 - x;
    }
    return { x, y };
  }
});

class Missions {
  constructor() {
    this.left = new Mission(false);
    this.right = new Mission(true);

    const sides = ["left", "right"];

    this.pressure = {
      sum: 0,
      centerOfMass: { x: 0, y: 0 },
      weight: { left: 0, right: 0 },
      update: () => {
        this.pressure.sum = this.left.pressure.sum + this.right.pressure.sum;

        sides.forEach(side => {
          this.pressure.weight[side] =
            this[side].pressure.sum / this.pressure.sum || 0;
        });

        this.pressure.centerOfMass.x = this.pressure.weight.right;
        this.pressure.centerOfMass.y =
          this.left.pressure.centerOfMass.y * this.pressure.weight.left +
            this.right.pressure.centerOfMass.y * this.pressure.weight.right ||
          0;

        this.dispatchEvent({ type: "pressure" });
      }
    };

    sides.forEach(side => {
      this[side].addEventListener("pressure", event => {
        this.pressure.update();
      });

      this[side].addEventListener("connect", event => {
        window.addEventListener("beforeunload", event => {
          this[side].configureSensors({
            accelerometer: false,
            gyroscope: false,
            quaternion: false,
            pressure: false
          });
        });
      });
    });
  }
}
Object.assign(Missions.prototype, EventDispatcher.prototype);
