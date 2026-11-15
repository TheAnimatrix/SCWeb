---
title: Getting started
description: Set up the Arduino IDE for LorNode V2, upload your first sketch, and see the LED blink and the battery reading in the Serial Monitor.
order: 2
---

# Getting started

This page takes you from a board in a bag to a blinking LED and a battery reading on your screen. It takes about fifteen minutes, most of it downloads.

## What you need

- A LorNode V2.
- Its antenna.
- A USB-C cable that carries data. Some cables only charge. If in doubt, use one you know works for file transfer with a phone.
- A computer with the [Arduino IDE](https://www.arduino.cc/en/software) (version 2 is easiest).
- Optional: a single-cell Li-ion battery. You don't need one for this page. The board runs from USB alone.

## 1. Fit the antenna

Do this first and leave it on. The examples that use LoRa transmit as soon as they start, and transmitting without an antenna can damage the LoRa module.

## 2. Install ESP32 support

1. Open the Arduino IDE.
2. Open **Boards Manager** (the board icon in the left bar, or **Tools > Board > Boards Manager**).
3. Search for **esp32** and install **esp32 by Espressif Systems**.

If it doesn't show up in the search, open **File > Preferences**, paste this into **Additional boards manager URLs**, and search again:

```
https://espressif.github.io/arduino-esp32/package_esp32_index.json
```

## 3. Install the libraries

Two come from the Library Manager (the books icon in the left bar):

- **LoRa** by Sandeep Mistry
- **Adafruit NeoPixel**

The LorNode library itself isn't in the Library Manager yet, so install it from a zip:

1. Go to [github.com/TheAnimatrix/LorNode](https://github.com/TheAnimatrix/LorNode).
2. Click **Code > Download ZIP**.
3. In the Arduino IDE, choose **Sketch > Include Library > Add .ZIP Library** and pick the file you downloaded.

## 4. Plug in and pick the board

1. Connect the board to your computer with the USB-C cable.
2. Choose **Tools > Board > esp32 > ESP32 Dev Module**.
3. Choose **Tools > Port** and pick the port that appeared when you plugged in. On Windows it is called something like `COM5`. On macOS and Linux it has `usbserial` or `ttyUSB` in the name.

Leave the other settings in the Tools menu as they are.

## 5. Upload the first sketch

1. Open **File > Examples > LorNode > 01_BlinkAndBattery**.
2. Click **Upload** (the arrow button).
3. Wait for "Hard resetting via RTS pin" in the output panel. That means it worked.

You don't need to press any buttons. The board puts itself into upload mode.

## 6. See it working

The RGB LED now cycles red, green, blue, one colour a second.

Open the Serial Monitor (**Tools > Serial Monitor**) and set the speed to **115200 baud**. You should see lines like this:

```
LorNode is awake.
Battery: 3948 mV (69%) [reading capped, battery is fuller than this] | 5V input: yes
Battery: 3951 mV (70%) [reading capped, battery is fuller than this] | 5V input: yes
```

Your numbers will differ. What the parts mean:

- **Battery** is the battery voltage in millivolts, with a rough charge level in brackets. With no battery connected this number doesn't mean anything, so ignore it.
- **reading capped** shows up when the battery is above about 3.95 V. Boards shipped so far can't measure higher than that. Nothing is wrong. [Power and battery](/docs/lornode/power-and-battery#the-r16-story) explains why and what you can do about it.
- **5V input** is `yes` while USB-C or the CHG IN pads have 5 V on them.

That's it. The board, the toolchain and the library all work.

## Next steps

- Got two boards? Try [02_LoRaPingPong](https://github.com/TheAnimatrix/LorNode/tree/main/examples/02_LoRaPingPong) to see them talk.
- Want to wire up a sensor? Look at the [Pinout](/docs/lornode/pinout) first.
- Going to run from a battery? Read [Power and battery](/docs/lornode/power-and-battery).
- Browse all the [examples](/docs/lornode/examples).

## No port shows up

If nothing new appears under **Tools > Port** when you plug the board in, work down this list.

1. **Try another cable.** This is the cause most of the time. Charge-only cables look the same as data cables.
2. **Try another USB port**, directly on the computer rather than through a hub.
3. **Install the CH340 driver (Windows).** The board uses a CH340C USB-serial chip. Recent versions of Windows usually have the driver already. If the board shows up in Device Manager as an unknown device, install the CH340 driver from WCH, the company that makes the chip: [wch-ic.com/downloads/CH341SER_EXE.html](https://www.wch-ic.com/downloads/CH341SER_EXE.html). Then unplug and replug the board.
4. **On Linux, check permissions.** If the port is there but uploads are refused, add yourself to the `dialout` group (`sudo usermod -a -G dialout $USER`), then log out and back in.
5. **Is your sketch switching the USB chip off?** The USB chip is powered from the switchable 3V3 SW rail. A sketch that calls `LorNode.peripheralPower(false)` or goes to deep sleep takes the port away with it. Hold **BOOT**, tap **RST**, then let go of **BOOT**. The board now waits in upload mode with the rail on, and the port comes back.

More fixes are on the [Troubleshooting](/docs/lornode/troubleshooting) page.
