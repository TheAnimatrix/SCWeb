---
title: Power and battery
description: How to power LorNode V2 from USB-C or a Li-ion cell, how charging and the two 3.3 V rails work, how to read the battery, and how to sleep.
order: 4
---

# Power and battery

## Ways to power the board

| Source      | Where                         | Notes                                                              |
| ----------- | ----------------------------- | ------------------------------------------------------------------ |
| USB-C       | The USB-C connector           | Powers the board and charges the battery                           |
| 5 V supply  | The **CHG IN 5V** pads (J6)   | Same as USB-C, for when you don't want a USB cable in your project |
| Li-ion cell | The **BAT + and -** pads (J4) | Runs the board when no 5 V is plugged in                           |

You can run the board from USB alone, with no battery connected.

Here is the path the power takes:

```
USB-C or CHG IN (5 V) ──> charger (TP4056) ──> battery
          │                                       │
          └──────────────> VIN <──────────────────┘
                            │
              ┌─────────────┴─────────────┐
        regulator 1                 regulator 2
        3V3, always on              3V3 SW, switchable
        ESP32                       LoRa, RGB LED, USB chip
```

**VIN** is whatever feeds the regulators at the moment: the 5 V input minus a diode drop while 5 V is plugged in, otherwise the battery.

## The two 3.3 V rails

LorNode has two 3.3 V regulators instead of one. This is the idea that makes low-power sleep work, so it is worth a minute.

- **3V3** comes from regulator 1. It is always on and powers the ESP32.
- **3V3 SW** comes from regulator 2. It powers the LoRa module, the RGB LED and the CH340C USB chip. It is on by default, and GPIO27 can switch it off.

When the ESP32 sleeps, it needs very little. The parts around it are another matter: a USB chip and an RGB LED keep drawing current whether you use them or not. So we put them on their own regulator and let the ESP32 turn that regulator off.

In code:

```cpp
LorNode.peripheralPower(false);  // 3V3 SW off
LorNode.peripheralPower(true);   // 3V3 SW back on
```

Three things to remember when 3V3 SW is off:

1. **USB serial goes quiet.** The USB chip has no power, so `Serial.print()` output goes nowhere and your computer may drop the port until the rail is back.
2. **The LED and the radio are off.** After switching the rail back on, call `LorNode.loraBegin()` again before you use LoRa.
3. **Anything you power from the 3V3 SW pin turns off too.** That is usually what you want for sensors.

The rail is on by default because of a pull-up resistor on the regulator's enable pin. So a brand new board, or one with an empty sketch, always has working USB.

## Choosing a battery

Use **one Li-ion or Li-Po cell**, the 3.7 V kind that charges to 4.2 V. An 18650 or a flat pouch cell both work.

- **One cell only.** Never connect two cells in series. Higher voltage will damage the board.
- **4.2 V chemistry only.** The charger is made for standard Li-ion and Li-Po. Don't connect LiFePO4 or anything else.
- **Protection is already on the board.** The FS312F and FS8205A cut the cell off before it is run too low or pushed too hard. A plain cell without its own protection circuit is fine. A cell that has one is fine too.
- **Check the polarity twice.** Match + and - on the board before you solder or plug in. Getting it backwards can destroy the board.

## Charging

Plug in USB-C, or connect 5 V to the CHG IN pads. The TP4056 charger takes care of the rest. You don't need any code for it.

There are two small charge LEDs on the board, **CHRG** and **STDBY**. CHRG is lit while the battery charges, and STDBY takes over when it is done.

Those LEDs are wired to the charger chip only. The ESP32 can't see them. So a sketch can find out whether 5 V is plugged in, but not whether the battery is still charging or already full:

```cpp
if (LorNode.externalPower()) {
  // USB-C or CHG IN has 5 V on it
}
```

## Reading the battery

```cpp
uint16_t mv = LorNode.batteryMillivolts();  // for example 3812
uint8_t pct = LorNode.batteryPercent();     // for example 43
```

`batteryPercent()` turns the voltage into a rough charge level using a typical Li-ion curve. Treat it as a guide. It is most honest when the battery is resting. While charging, or right after a LoRa transmission, the voltage moves and the percentage moves with it.

With no battery connected, the readings don't mean anything.

## The R16 story

This is the one quirk of the board you should know about.

The ESP32 measures the battery through two resistors, R16 and R10. Together they scale the battery voltage down to something the ESP32 can measure. R10 is 160k. **R16 is 44.2k on every board shipped so far.**

With 44.2k, the scaled voltage runs past the top of the ESP32's measuring range once the battery is above roughly 3.95 V. From there up, the reading stops climbing.

### What it means for you

- A full or nearly full battery **reads as about 3.95 V**, and `batteryPercent()` sits at around 70%, until the battery has drained below that point.
- Below about 3.95 V, readings are normal.
- **Nothing is wrong with the battery or the charging.** The battery still charges all the way. Only the measurement is capped.
- The lower part of the range, where you decide "time to recharge", is not affected.

The library tells you when a reading is capped:

```cpp
if (LorNode.batterySaturated()) {
  Serial.println("Battery is at least 3.95 V");
} else {
  Serial.printf("Battery: %u mV\n", LorNode.batteryMillivolts());
}
```

### Which board do I have?

If you have a board today, it has 44.2k. The library assumes that, so you don't need to set anything.

Future batches will have a 100k resistor for R16, which lets the board measure the full range up to 4.2 V. To check a board yourself, run [01_BlinkAndBattery](https://github.com/TheAnimatrix/LorNode/tree/main/examples/01_BlinkAndBattery) with a freshly charged battery:

- It prints about 3950 mV and "reading capped": your board has **44.2k**.
- It prints a number that is clearly too low for a full battery, and no "reading capped": your board has **100k** and the library needs to be told. See below.

### Telling the library about a 100k board

Set it when you call `begin()`:

```cpp
LorNodeConfig config;
config.batteryTopOhms = LORNODE_R16_REVISED_OHMS;  // 100000
LorNode.begin(config);
```

If your build system lets you pass compiler flags (PlatformIO does), you can define it once for the whole project instead:

```
-DLORNODE_R16_OHMS=100000
```

### The optional rework

If you are comfortable soldering 0603 parts, you can swap R16 for a 100k resistor yourself and get the full range. R16 is marked in the KiCad board file and the schematic in the [hardware files](/docs/lornode/hardware). After the swap, tell the library as shown above.

You don't have to do this. For most projects, knowing "at least 3.95 V" at the top is enough.

### Calibrating with a multimeter

Resistors and the ESP32's analog input both have some tolerance, so readings can be a little off from board to board. You can correct that once with a multimeter:

1. Run the board from the battery, with the battery somewhere between 3.4 V and 3.9 V. Outside that range the correction is less reliable, and above about 3.95 V the reading is capped so it can't work at all.
2. Measure the battery voltage with the multimeter, across the BAT pads.
3. Pass that value, in millivolts, to `calibrateBattery()` in a one-off sketch:

```cpp
#include <LorNode.h>

void setup() {
  Serial.begin(115200);
  LorNode.begin();
  bool ok = LorNode.calibrateBattery(3760);  // your multimeter reading in mV
  Serial.println(ok ? "Calibration saved." : "Calibration failed.");
}

void loop() {}
```

The correction is stored in the board's flash. It survives resets and new sketches, and every later reading uses it. To remove it, call `LorNode.clearBatteryCalibration()`.

`calibrateBattery()` returns `false` and saves nothing if the reading is capped, or if your value is more than 20% away from what the board measured. That usually means a typo or a wrong R16 setting.

## Sleep

Deep sleep is how a battery project lasts. One call does it:

```cpp
LorNode.sleepFor(300);  // sleep for 5 minutes
```

`sleepFor()` puts the radio to sleep, switches the 3V3 SW rail off, and holds it off for the whole sleep. Then the ESP32 goes into deep sleep. When the time is up, the board **restarts from `setup()`**. It does not carry on from the line after `sleepFor()`.

So a battery sketch usually looks like this:

```cpp
void setup() {
  LorNode.begin();
  // read a sensor, send a packet
  LorNode.sleepFor(300);
}

void loop() {}  // never runs
```

Good to know:

- **Variables are lost** across sleep. `LorNode.bootCount()` does survive, and tells you how many times the board has started since it was powered up.
- **Wake on a pin** with `LorNode.sleepUntilPin(gpio, level)`, for a button or a sensor's alert output. See the [Library reference](/docs/lornode/library#sleepuntilpin).
- **Keep the rail on** with `LorNode.sleepFor(seconds, true)` if something on 3V3 SW must stay powered. The board will use more power while asleep.
- **USB disappears during sleep**, because the USB chip is on 3V3 SW. If an upload can't reach a sleeping board, hold BOOT, tap RST, let go of BOOT, then upload.
- **Anything on the always-on 3V3 pin keeps drawing current** during sleep. Power sensors from 3V3 SW when you can.

### How low does it go?

We haven't published measured sleep current or battery life figures yet. They are coming. Until then we won't quote a number, because it depends on your battery, how often you wake and what you connect to the board.

[03_DeepSleepBeacon](https://github.com/TheAnimatrix/LorNode/tree/main/examples/03_DeepSleepBeacon) is the smallest working sleep example.
