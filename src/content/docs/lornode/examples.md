---
title: Examples
description: A walkthrough of the seven LorNode V2 example sketches, with what each one shows, how to wire it and what you will see when it runs.
order: 7
---

# Examples

The library comes with seven sketches. They go from "does my board work" to a complete two-board project. After installing the library you'll find them in the Arduino IDE under **File > Examples > LorNode**.

All of them print to the Serial Monitor at **115200 baud**. Every example except the first uses the radio, so fit the antenna before you run it.

| Example                                     | Boards | Extra parts              | Shows                                          |
| ------------------------------------------- | ------ | ------------------------ | ---------------------------------------------- |
| [01_BlinkAndBattery](#01_blinkandbattery)   | 1      | None                     | LED, battery reading, 5 V detection            |
| [02_LoRaPingPong](#02_lorapingpong)         | 2      | None                     | Sending and receiving, signal strength         |
| [03_DeepSleepBeacon](#03_deepsleepbeacon)   | 1 or 2 | None                     | Deep sleep with the rail switched off          |
| [04_SensorNode](#04_sensornode)             | 1 or 2 | BME280 sensor            | A sleeping sensor node with a binary packet    |
| [05_LoRaWiFiGateway](#05_lorawifigateway)   | 2      | None                     | Forwarding LoRa packets to a server over Wi-Fi |
| [06_WaterTankSensor](#06_watertanksensor)   | 2      | US-100 ultrasonic sensor | The outdoor half of a tank level monitor       |
| [06_WaterTankGateway](#06_watertankgateway) | 2      | None                     | The indoor half of a tank level monitor        |

## 01_BlinkAndBattery

[Open the sketch](https://github.com/TheAnimatrix/LorNode/tree/main/examples/01_BlinkAndBattery)

**What it shows:** the board is alive. It cycles the RGB LED and prints the battery voltage, the charge level and whether 5 V is plugged in.

**Wiring:** none.

**What you'll see:** the LED changes between red, green and blue once a second, and the Serial Monitor prints a line like:

```
Battery: 3812 mV (43%) | 5V input: yes
```

If the battery is above about 3.95 V, the line also says `[reading capped, battery is fuller than this]`. That is normal on boards shipped so far. See [the R16 story](/docs/lornode/power-and-battery#the-r16-story).

## 02_LoRaPingPong

[Open the sketch](https://github.com/TheAnimatrix/LorNode/tree/main/examples/02_LoRaPingPong)

**What it shows:** two boards talking to each other. Each one sends a ping every few seconds and listens for the other.

**Wiring:** none. You need two LorNodes, both with antennas.

**How to run it:** upload the same sketch to both boards and power them up.

**What you'll see:** each board prints the pings it hears, with the signal strength:

```
Heard "ping 12 from A3F1"  RSSI -48 dBm  SNR 9.5 dB
```

The LED shows the strength of the last ping: green for strong, orange for fair, red for weak. Put one board on a battery and carry it around to see how the link holds up. A solid red LED right after power-up means the radio didn't start.

## 03_DeepSleepBeacon

[Open the sketch](https://github.com/TheAnimatrix/LorNode/tree/main/examples/03_DeepSleepBeacon)

**What it shows:** the wake, send, sleep pattern that battery projects are built on. The board sends one packet with its boot count and battery voltage, then sleeps for 60 seconds with the 3V3 SW rail off.

**Wiring:** none.

**What you'll see:** not much on the beacon itself, and that is the point. It is awake for a moment each minute. To see the packets, run 02_LoRaPingPong on a second board and watch its Serial Monitor:

```
Heard "beacon boot=7 bat=3790mV"  RSSI -52 dBm  SNR 9.8 dB
```

**Good to know:** the USB chip is off while the board sleeps, so the serial port goes quiet and may disappear from your computer between wake-ups. To upload a new sketch, hold BOOT, tap RST, let go of BOOT, then upload.

## 04_SensorNode

[Open the sketch](https://github.com/TheAnimatrix/LorNode/tree/main/examples/04_SensorNode)

**What it shows:** a real sensor node. It reads temperature, humidity and pressure from a BME280, packs them with the battery voltage into a 13-byte packet, sends it and sleeps for five minutes.

**Extra library:** install **Adafruit BME280 Library** from the Library Manager. Say yes when it offers to install its dependencies.

**Wiring:**

| BME280 | LorNode |
| ------ | ------- |
| VCC    | 3V3 SW  |
| GND    | GND     |
| SDA    | GPIO21  |
| SCL    | GPIO22  |

The sensor is powered from 3V3 SW on purpose. It switches off with the rail while the board sleeps.

**What you'll see:** on each wake the Serial Monitor prints `Sent 13 bytes`. If the sensor isn't found it prints `BME280 not found. Check the wiring.` and still sends a packet, with the temperature set to a marker value.

The packet is binary, not text, so it will look like garbage in 02_LoRaPingPong. The layout is the `Reading` struct at the top of the sketch. Use the same struct on the receiving side to decode it.

## 05_LoRaWiFiGateway

[Open the sketch](https://github.com/TheAnimatrix/LorNode/tree/main/examples/05_LoRaWiFiGateway)

**What it shows:** a bridge from LoRa to the internet. The board listens for LoRa packets and sends each one to a web address as JSON, over Wi-Fi.

**Wiring:** none. Keep the board on USB power within reach of your Wi-Fi.

**How to run it:**

1. In the sketch folder, copy `secrets.example.h` to `secrets.h`.
2. Fill in your Wi-Fi name, your password, and the URL that should receive the data.
3. Upload.

`secrets.h` is ignored by git, so your password stays out of the repo.

**What you'll see:** the LED glows dim blue while the board waits, and flashes green when a packet arrives. The Serial Monitor shows:

```
Got 24 bytes, RSSI -61
POST -> 200
```

Your server receives a body like this:

```json
{"payload":"beacon boot=7 bat=3790mV","rssi":-61,"snr":9.5}
```

It works best with text packets, such as the ones from 03_DeepSleepBeacon. This sketch keeps Wi-Fi on and never sleeps, so it is meant for USB power, not a battery.

## 06_WaterTankSensor

[Open the sketch](https://github.com/TheAnimatrix/LorNode/tree/main/examples/06_WaterTankSensor)

**What it shows:** a complete project, together with 06_WaterTankGateway. This half sits on top of a water tank. Every 15 minutes it wakes, measures the distance down to the water with an ultrasonic sensor, sends it over LoRa and goes back to sleep.

**Wiring:** a US-100 ultrasonic sensor, with its jumper fitted so it works in serial mode.

| US-100  | LorNode |
| ------- | ------- |
| VCC     | 3V3 SW  |
| GND     | GND     |
| Trig/TX | GPIO26  |
| Echo/RX | GPIO25  |

**What you'll see:** on each wake the Serial Monitor prints `Sent distance 412 mm`. A distance of 0 means the sensor didn't answer.

The packet is a line of text: `tank,<node>,<distance mm>,<battery mV>,<5V present>`. The distance is from the sensor to the water, so a smaller number means a fuller tank. Turning that into a percentage is up to you, because it depends on how tall your tank is.

## 06_WaterTankGateway

[Open the sketch](https://github.com/TheAnimatrix/LorNode/tree/main/examples/06_WaterTankGateway)

**What it shows:** the indoor half of the water tank project. It listens for packets from the tank sensor, checks they are in the expected format, and posts them to your server as JSON.

**Wiring:** none. Keep the board on USB power within reach of your Wi-Fi.

**How to run it:** copy `secrets.example.h` to `secrets.h` and fill it in, the same way as for 05_LoRaWiFiGateway. Then upload.

**What you'll see:** dim blue while waiting, a green flash for each reading, and in the Serial Monitor:

```
Tank A3F1: 412 mm, battery 3790 mV, RSSI -70
POST -> 200
```

Your server receives:

```json
{"node":"A3F1","distance_mm":412,"battery_mv":3790,"external_power":false,"rssi":-70}
```

Packets that don't start with `tank,` are ignored, so other LoRa traffic nearby won't confuse it.
