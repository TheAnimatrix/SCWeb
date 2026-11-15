---
title: LoRa
description: How to use the 433 MHz LoRa radio on LorNode V2, from fitting the antenna to sending and receiving packets with the Arduino LoRa library.
order: 5
---

# LoRa

LoRa is a radio that trades speed for reach. It sends small packets slowly, and in return they travel much further than Wi-Fi or Bluetooth. It suits sensor readings and short messages. It does not suit photos, audio or anything chatty.

LorNode carries an Ai-Thinker Ra-01 module, which is built around the SX1278 chip and works at **433 MHz**.

## Before you transmit

**Fit the antenna first.** Never transmit without one. With nowhere for the power to go, the radio's output stage can be damaged. The examples transmit as soon as they start, so put the antenna on before you power the board and leave it on.

**Check your local rules.** The rules for 433 MHz devices differ from country to country: which frequencies you may use, how much power, and how often you may transmit. It is your job to check what applies where you live before you switch the radio on.

## Starting the radio

The radio is wired to the ESP32 like this. You don't need to remember it, because the library sets it up for you.

| LoRa signal       | ESP32 pin              |
| ----------------- | ---------------------- |
| NSS (chip select) | GPIO4                  |
| RESET             | GPIO16                 |
| DIO0              | GPIO13                 |
| SCK, MISO, MOSI   | GPIO18, GPIO19, GPIO23 |

One call starts it:

```cpp
#include <LorNode.h>

void setup() {
  Serial.begin(115200);
  LorNode.begin();

  if (!LorNode.loraBegin()) {  // 433 MHz unless you say otherwise
    Serial.println("LoRa did not start.");
    while (true) delay(1000);
  }
}
```

`loraBegin()` switches the 3V3 SW rail on if it is off, tells the LoRa library which pins to use, and starts the radio. It returns `false` if the module doesn't answer.

To use another frequency the module supports, pass it in hertz: `LorNode.loraBegin(434E6)`. Both ends of a link must use the same one.

From here on you use the global `LoRa` object from the Arduino [LoRa library](https://github.com/sandeepmistry/arduino-LoRa) by Sandeep Mistry. `LorNode.h` already includes it.

## Sending

```cpp
LoRa.beginPacket();
LoRa.print("hello from LorNode");
LoRa.endPacket();
```

`endPacket()` waits until the packet has gone out, then returns. You can use `print()`, `printf()` and `write()` between the two calls, just like with `Serial`.

## Receiving

Ask for a packet in `loop()`:

```cpp
void loop() {
  int size = LoRa.parsePacket();
  if (size) {
    String msg;
    while (LoRa.available()) msg += char(LoRa.read());
    Serial.printf("Got \"%s\"  RSSI %d dBm\n", msg.c_str(), LoRa.packetRssi());
  }
}
```

`parsePacket()` returns the size of a waiting packet, or 0 if there is none. `packetRssi()` tells you how strong the signal was. It is a negative number, and closer to zero is stronger.

[02_LoRaPingPong](https://github.com/TheAnimatrix/LorNode/tree/main/examples/02_LoRaPingPong) puts sending and receiving together in one sketch for two boards.

## Tuning

These are LoRa library calls. Make them after `loraBegin()`.

| Call                          | What it does                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `LoRa.setSpreadingFactor(sf)` | 7 to 12. Higher reaches further but each packet takes much longer to send. The default is 7.            |
| `LoRa.setTxPower(dBm)`        | Transmit power, 2 to 20. The default is 17. Use only as much as you need and as your local rules allow. |
| `LoRa.setSignalBandwidth(hz)` | Channel width. The default is `125E3`. Narrower reaches further and is slower.                          |
| `LoRa.enableCrc()`            | Adds a checksum so damaged packets are dropped instead of delivered.                                    |
| `LoRa.setSyncWord(byte)`      | A simple way to ignore packets from other people's LoRa projects nearby.                                |

Two rules:

- **Both ends must match.** A sender and a receiver with different spreading factor, bandwidth, sync word or frequency will not hear each other.
- **Settings are lost when the radio loses power.** After deep sleep, or after `peripheralPower(false)`, call `loraBegin()` and your tuning calls again. In a sleep sketch that happens naturally, because everything runs from `setup()` on each wake.

## Tips

- **Keep packets small.** A packet can hold at most 255 bytes, and you should aim for far less. Shorter packets spend less time on air, which saves battery and leaves the channel free for others. [04_SensorNode](https://github.com/TheAnimatrix/LorNode/tree/main/examples/04_SensorNode) packs a full weather reading into 13 bytes.
- **Send less often.** A reading every few minutes is plenty for most sensors.
- **Add a little randomness** to the send time if several boards share a channel, so they don't keep landing on top of each other. 02_LoRaPingPong does this.
- **Put the radio to sleep** with `LoRa.sleep()` when you won't need it for a while but want to keep the rail on. `LorNode.sleepFor()` does this for you before deep sleep.
- **Start close.** Get two boards talking on your desk first, then move them apart.
- **Use RSSI to place your nodes.** The LED in 02_LoRaPingPong shows green, orange or red by signal strength, so you can walk around with a board on a battery and see how the link holds up.

## How far does it reach?

We don't have measured range figures to share yet. They are coming. Range depends heavily on antennas, height, buildings and your settings, so the honest way to find out for your site is to test it with 02_LoRaPingPong.

## The spare DIO pins

The Ra-01 has six DIO lines. DIO0 is wired to GPIO13, and it is the only one the LoRa library uses. DIO1 to DIO5 come out on header J7, printed `L1` to `L5`, and are not connected to the ESP32. If your own code or another library needs one, run a jumper from J7 to a free GPIO. See the [Pinout](/docs/lornode/pinout).

## Sharing the SPI bus

The radio sits on the ESP32's default SPI bus (GPIO18, 19 and 23). You can put other SPI devices, such as an SD card or a display, on the same three pins. Give each device its own chip-select pin, and don't use GPIO4 for it.

## What about LoRaWAN?

The library and the examples here use plain LoRa: your boards talk directly to each other. The LorNode library does not include LoRaWAN support.
