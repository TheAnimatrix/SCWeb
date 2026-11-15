---
title: Overview
description: LorNode V2 is an open source ESP32 board with a 433 MHz LoRa radio, USB-C, Li-ion charging and a switchable power rail for low-power sleep.
order: 1
---

# LorNode V2

LorNode V2 is an ESP32 board with a LoRa radio on it. You program it over USB-C from the Arduino IDE, like any other ESP32 board. The difference is what else is on the board: a 433 MHz LoRa module, a Li-ion charger with battery protection, and a second 3.3 V regulator that your code can switch off to save power.

That makes it a good fit for small things that sit somewhere far from a wall socket, wake up now and then, send a few bytes over LoRa and go back to sleep.

You can buy one on the [product page](https://selfcrafted.in/LorNode_V2/craft/item=284b6710-b260-4112-b0e7-3387f826d8c2). The design is open source, so you can also build your own from the [hardware files](/docs/lornode/hardware).

## What's on the board

- **ESP32-WROOM-32** module, with Wi-Fi and Bluetooth.
- **Ai-Thinker Ra-01** LoRa module (SX1278) for 433 MHz.
- **USB-C** with a CH340C USB-serial chip. Uploads reset the board for you, no button pressing.
- **BOOT** and **RST** buttons.
- **Li-ion charger** (TP4056) that charges from USB-C or from the CHG IN 5 V pads.
- **Battery protection** on board (FS312F and FS8205A), so the cell is cut off before it runs too low.
- **Two 3.3 V regulators** (RT9080). One always powers the ESP32. The other powers the LoRa module, the RGB LED and the USB chip, and can be switched off from code.
- **RGB LED** (WS2812B).
- **Battery and 5 V sensing**, so a sketch can read the battery voltage and tell whether 5 V is plugged in.
- **Two pin headers** with 18 and 15 pins, plus a small header with the LoRa module's spare DIO pins.
- **Four M3 mounting holes** on a board of about 74 x 44 mm (73.9 x 43.6 mm).

## What the library gives you

The [LorNode library](/docs/lornode/library) wraps the board-specific parts so your sketch stays short:

- `LorNode.loraBegin()` sets the LoRa pins and starts the radio.
- `LorNode.led(r, g, b)` drives the RGB LED.
- `LorNode.batteryMillivolts()` and `LorNode.batteryPercent()` read the battery.
- `LorNode.externalPower()` tells you whether 5 V is plugged in.
- `LorNode.sleepFor(seconds)` switches off everything it can and goes to deep sleep.

For the radio itself you use the regular Arduino `LoRa` library. Nothing new to learn there.

## What you can build

The [examples](/docs/lornode/examples) are small, working starting points:

- Two boards pinging each other, to see LoRa working and check signal strength.
- A battery beacon that wakes, sends one packet and sleeps.
- A sensor node that sends temperature, humidity and pressure.
- A gateway that listens for LoRa packets and posts them to a server over Wi-Fi.
- A water tank level sensor with its own gateway.

## Things to know up front

- **Fit the antenna before you transmit.** Sending without an antenna can damage the LoRa module.
- **433 MHz rules differ from country to country.** Check the local rules for 433 MHz devices before you use the radio.
- **Battery readings top out at about 3.95 V on boards shipped so far.** The battery itself is fine. See [Power and battery](/docs/lornode/power-and-battery#the-r16-story).
- **We haven't published measured numbers yet** for sleep current, battery life or radio range. They are coming, and we would rather give you real figures than guesses.

## Where to go next

- New board on your desk? Start with [Getting started](/docs/lornode/getting-started).
- Wiring something up? See the [Pinout](/docs/lornode/pinout).
- Running from a battery? Read [Power and battery](/docs/lornode/power-and-battery).
- Sending data? Read [LoRa](/docs/lornode/lora).
- Looking for a function? See the [Library reference](/docs/lornode/library).
- Something not working? Try [Troubleshooting](/docs/lornode/troubleshooting).
