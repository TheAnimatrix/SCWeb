---
title: Troubleshooting
description: Fixes for common LorNode V2 problems, including no serial port, failed uploads, a board that won't boot, LoRa not starting and odd battery readings.
order: 9
---

# Troubleshooting

Find your symptom below. Each one starts with the most likely cause.

## No serial port shows up

1. **Swap the cable.** Charge-only USB-C cables are the usual culprit. Use one you know carries data.
2. **Try another USB port**, directly on the computer and not through a hub.
3. **Windows: install the CH340 driver.** If Device Manager shows an unknown device when you plug in, install the driver from WCH, who make the chip: [wch-ic.com/downloads/CH341SER_EXE.html](https://www.wch-ic.com/downloads/CH341SER_EXE.html). Unplug and replug the board afterwards.
4. **Linux: check permissions.** Add yourself to the `dialout` group with `sudo usermod -a -G dialout $USER`, then log out and back in.
5. **Your sketch may have switched the USB chip off.** See [the port disappears](#the-port-disappears-or-serial-goes-quiet) below.

## Upload fails

**"Failed to connect" or "Timed out waiting for packet header".** The board didn't go into upload mode by itself. Do it by hand:

1. Hold **BOOT**.
2. Tap **RST**.
3. Let go of **BOOT**.
4. Click Upload.
5. When the upload finishes, tap **RST** to start your sketch.

Also check:

- **Board** is set to **ESP32 Dev Module**, and the right **Port** is selected.
- The Serial Monitor of another program isn't holding the port open.
- Nothing you wired up is pulling **GPIO0** or **GPIO2** the wrong way. GPIO2 must be low or floating for uploads to work. Unplug your wiring and try again.
- **The board is asleep.** A sketch that deep-sleeps has the USB chip switched off most of the time. Use the BOOT and RST steps above. They wake the board and keep it waiting in upload mode.

## The board won't boot

The LED stays dark, nothing prints, and the board seems dead as soon as you connect your circuit.

**Check GPIO12 first.** GPIO12 must be low at the moment the board resets. If something you connected pulls it high, such as a pull-up resistor or a sensor output that idles high, the ESP32 starts with the wrong flash voltage and can't boot.

To confirm, disconnect whatever is on GPIO12 and press RST. If the board comes back, move that wire to another pin. GPIO32 and GPIO33 are good choices.

The other boot pins can cause trouble too:

- **GPIO0** held low at reset puts the board in upload mode, so your sketch doesn't run.
- **GPIO2** pulled high at reset blocks uploads.
- **GPIO5** and **GPIO15** are best left without external pull-ups or pull-downs.

The [Pinout](/docs/lornode/pinout#cautions) page has the full list.

## LoRa won't start

`LorNode.loraBegin()` returns `false`, or an example prints "LoRa did not start".

1. **Call `LorNode.begin()` first**, before `loraBegin()`.
2. **Check your wiring on the LoRa pins.** GPIO4, 13 and 16 belong to the radio. GPIO18, 19 and 23 are the SPI bus it sits on. Anything else connected to those pins can stop the radio from answering. Disconnect it and try again.
3. **Another SPI device may be talking over it.** If you share the SPI bus, every device needs its own chip-select pin, and that pin must be held high while the radio is in use.
4. **Press RST and try once more.** If it works after a reset but not after `peripheralPower(true)`, make sure you call `loraBegin()` again every time the rail has been off.

A missing antenna does not make `loraBegin()` fail. Still, never transmit without one.

## LoRa starts but nothing is received

- **Both boards must use the same settings**: frequency, spreading factor, bandwidth and sync word. If you changed one on one board, change it on the other.
- **Antennas fitted on both boards?**
- **Too close can be a problem too.** If the antennas are almost touching, move the boards apart a little.
- **Is the sender asleep?** A beacon is only on air for a moment. Wait for a full sleep period before deciding it doesn't work.
- **Receiving binary packets** as text shows garbage. 04_SensorNode sends binary on purpose.

## The LED doesn't light

The RGB LED is powered from the 3V3 SW rail. If the rail is off, `LorNode.led()` does nothing.

- Did you call `LorNode.begin()`? The LED needs it.
- Did you call `LorNode.peripheralPower(false)`, or start with `peripheralsOn = false`? Switch the rail on with `LorNode.peripheralPower(true)`, then set the colour again.
- Is `ledBrightness` set to 0 in your config?
- Is something else connected to **GPIO15**? That is the LED's data pin.
- During deep sleep the LED is always off.

The two small charge LEDs, CHRG and STDBY, are different. They belong to the charger and show charging status. Your sketch can't control them.

## The battery always reads about 3.95 V

That is expected on boards shipped so far. The board can't measure above roughly 3.95 V, so a full battery shows as about 3950 mV and around 70%. The battery is fine and it does charge fully.

`LorNode.batterySaturated()` returns `true` while the reading is capped. Once the battery drains below that point, readings are normal.

The reason, and the optional fix, are in [the R16 story](/docs/lornode/power-and-battery#the-r16-story).

## The battery reading is wrong

- **No battery connected?** Then the reading means nothing.
- **A bit off compared with your multimeter?** Calibrate it once. See [calibrating with a multimeter](/docs/lornode/power-and-battery#calibrating-with-a-multimeter).
- **Far too low, on a newer board?** Your board may have the revised 100k resistor while the library assumes 44.2k. Set `batteryTopOhms` to `100000`. See [telling the library about a 100k board](/docs/lornode/power-and-battery#telling-the-library-about-a-100k-board).
- **Jumping around?** The voltage dips during a LoRa transmission and rises while charging. Read it before you transmit.

## analogRead() fails when Wi-Fi is on

Analog reads on ADC2 pins don't work while Wi-Fi is on. That is how the ESP32 is built, and no setting changes it. The ADC2 pins on the headers are GPIO0, 2, 4, 12, 13, 14, 15, 25, 26 and 27.

Move your analog signal to **GPIO32, 33, 36 or 39**. Those are on ADC1 and work with Wi-Fi on.

The battery reading is not affected. It uses GPIO35, which is on ADC1.

## The port disappears, or Serial goes quiet

This happens after `LorNode.peripheralPower(false)` and during deep sleep. It is expected.

The CH340C USB chip is powered from the 3V3 SW rail. Switch the rail off and the USB chip goes with it. Anything you print goes nowhere, and your computer may remove the port until the rail is back.

- **To keep printing,** print first, call `Serial.flush()`, and only then switch the rail off.
- **To get Serial back,** call `LorNode.peripheralPower(true)`.
- **To debug a sleeping sketch,** pass `true` as the second argument to `sleepFor()` for now, so the rail stays on. Take it out again when you are done, because the board uses more power that way.
- **To upload to a board that keeps going back to sleep,** hold BOOT, tap RST, let go of BOOT, then upload.

## A sensor stops working after sleep, or loses its settings

If the sensor is powered from **3V3 SW**, it loses power every time the board sleeps. That is the idea, but it means you have to set the sensor up again on every wake. Do your sensor setup in `setup()` and you get this for free.

If a sensor really must stay on, power it from the always-on **3V3** pin. It will draw current the whole time the board sleeps.

## Still stuck?

Open an issue on [GitHub](https://github.com/TheAnimatrix/LorNode/issues) with what you tried, your sketch, and what the Serial Monitor shows.
