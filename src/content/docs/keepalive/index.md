---
title: Overview
description: KeepAlive is a small USB-C module that stops a power bank from switching itself off when your project draws too little current.
order: 1
---

# KeepAlive

Most power banks switch their output off after a few seconds if the load is small. A small load is exactly what an Arduino, a sensor board or a few LEDs looks like, so the bank goes to sleep and your project dies with it.

KeepAlive sits between the power bank and your circuit. It measures what your circuit draws and, only when that is too little to keep the bank awake, pulls a short pulse of current every few seconds.

> **This board hasn't been built yet.** The design passes KiCad's electrical and board rule checks and the firmware compiles. No board has been made, the firmware has never run on a chip, and no power bank has been tried. The numbers on these pages are calculated from datasheets, not measured. The pictures are renders of the design.

It is listed as an interest check on the [product page](/KeepAlive/craft/item=b320bdaf-1e9f-4f13-b7a8-c24b4b2823be): if enough people want one, a batch gets made.

## What it does

1. **Asks for power properly.** 5.1 kΩ pull-downs on both CC pins make a USB-C port turn on 5 V, up to 3 A, with no negotiation.
2. **Measures what your circuit draws.** A small microcontroller (PUYA PY32F002A) reads the current on the `OUT` pins four times a second.
3. **Pulses only when it has to.** If `OUT` drew less than about 200 mA at any moment in the last 5 seconds, the module switches a 100 mA load on for a quarter of a second. If your circuit drew more than that the whole time, it does nothing.

## The board

- 19.05 × 30.5 mm, with every part on the top side.
- A USB-C socket at one end for the cable from the power bank.
- Two rows of pins 0.6 in (15.24 mm) apart, so it plugs into a breadboard.
- Each pin is also a castellated pad on the board edge, so the module can be soldered flat onto another PCB.
- Three solder jumpers, `ECO`, `200mA` and `MAX`, to change the pulse. No reprogramming needed.
- A white status LED and an `EN` pin to switch the keep-alive off.
- Pin names printed on both sides.

## What it costs to run

These are worked out from the microcontroller's datasheet at 5.0 V. Nothing here has been measured.

| Situation                                              | Average current       |
| ------------------------------------------------------ | --------------------- |
| Your circuit draws enough, so no pulses are needed     | about 0.02 mA (16 µA) |
| Pulsing, default setting (100 mA for 250 ms every 5 s) | about 5.1 mA          |
| Pulsing, `ECO` jumper bridged (100 ms every 10 s)      | about 1.0 mA          |
| Pulsing, `MAX` jumper bridged (750 ms every 5 s)       | about 15 mA           |
| `200mA` jumper bridged                                 | twice the above       |

The measured output also drops 0.1 V per amp across its 0.1 Ω shunt, for example 20 mV at 200 mA.

## Where the default comes from

Power banks differ, and this board has not been tried on any. The default pulse was chosen from published measurements:

- The Electrokit EKM004 keep-alive uses 90 mA (with a 180 mA option) for 100 ms every 4 to 45 seconds.
- K4ICY measured power banks that needed 100 to 200 mA for 50 to 750 ms and switched off after 6 to 35 seconds.
- The IP5306 power bank chip switches off after 32 seconds below about 45 mA.

The default is longer than Electrokit's pulse and faster than the shortest timer measured. The jumpers are there for banks that need more.

## Next

[How to use it](/docs/keepalive/how-to-use) covers wiring, which pin to take power from, the jumpers and what the LED is telling you.
