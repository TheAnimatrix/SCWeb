---
title: Library reference
description: Reference for the LorNode Arduino library, covering every function, config field and pin constant for the LorNode V2 board.
order: 6
---

# Library reference

The LorNode library handles the parts that are specific to this board: the LoRa pins, the switchable power rail, the RGB LED, battery readings and deep sleep. For the radio itself you use the regular Arduino `LoRa` library.

## Install

1. Install **esp32 by Espressif Systems** from the Boards Manager.
2. Install **LoRa** (by Sandeep Mistry) and **Adafruit NeoPixel** from the Library Manager. The LorNode library needs both.
3. Download the [LorNode repo](https://github.com/TheAnimatrix/LorNode) as a zip (**Code > Download ZIP**) and add it with **Sketch > Include Library > Add .ZIP Library**.

The library isn't in the Arduino Library Manager yet, so the zip is the way to install it for now. Step-by-step instructions are in [Getting started](/docs/lornode/getting-started).

Choose **ESP32 Dev Module** as the board.

## The basics

```cpp
#include <LorNode.h>

void setup() {
  Serial.begin(115200);
  LorNode.begin();
}
```

There is one global object, `LorNode`. Call `LorNode.begin()` at the top of `setup()` before anything else from the library.

## Setup

### begin()

```cpp
void begin(const LorNodeConfig &config = LorNodeConfig());
```

Sets up the board. Call it once at the top of `setup()`. The board restarts from `setup()` after deep sleep, so it runs again on every wake-up, which is what you want.

With no argument it uses the defaults. To change something, fill in a `LorNodeConfig` first:

```cpp
LorNodeConfig config;
config.ledBrightness = 20;
LorNode.begin(config);
```

### LorNodeConfig

| Field                   | Default | What it does                                                                                                                                                                                         |
| ----------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `peripheralsOn`         | `true`  | Switch the 3V3 SW rail on in `begin()`. Set to `false` to start with the LoRa module, LED and USB chip off.                                                                                          |
| `batteryTopOhms`        | `44200` | Value of resistor R16 in ohms. Leave it alone on boards shipped so far. Set it to `100000` on a board with the revised resistor. See [the R16 story](/docs/lornode/power-and-battery#the-r16-story). |
| `useBatteryCalibration` | `true`  | Apply the correction saved by `calibrateBattery()`, if there is one.                                                                                                                                 |
| `ledBrightness`         | `48`    | Brightness of the RGB LED, 0 to 255. Every colour you pass to `led()` is scaled by this. The LED is very bright, so the default is low.                                                              |

## Power

### peripheralPower(on)

```cpp
void peripheralPower(bool on);
```

Switches the 3V3 SW rail on or off. That rail powers the LoRa module, the RGB LED, the USB chip, and anything you connect to the 3V3 SW pin.

```cpp
LorNode.peripheralPower(false);  // off
LorNode.peripheralPower(true);   // on again
```

While it is off, USB serial is silent and `led()` does nothing. After switching it back on, call `loraBegin()` again before using the radio.

### peripheralPower()

```cpp
bool peripheralPower() const;
```

Returns `true` if the 3V3 SW rail is on.

## LoRa

### loraBegin()

```cpp
bool loraBegin(long frequency = 433E6);
```

Starts the radio. It switches the 3V3 SW rail on if needed, sets the board's LoRa pins and starts the LoRa library. Returns `false` if the module did not answer.

```cpp
if (!LorNode.loraBegin()) {
  Serial.println("LoRa did not start.");
}
```

After this, use the `LoRa` object as usual. See [LoRa](/docs/lornode/lora). Fit the antenna before you transmit.

### loraReady()

```cpp
bool loraReady() const;
```

Returns `true` once `loraBegin()` has succeeded. It goes back to `false` when the 3V3 SW rail is switched off.

## RGB LED

### led(r, g, b)

```cpp
void led(uint8_t r, uint8_t g, uint8_t b);
```

Sets the colour of the RGB LED. Each value is 0 to 255, scaled by `ledBrightness`.

```cpp
LorNode.led(255, 0, 0);    // red
LorNode.led(255, 160, 0);  // orange
```

Does nothing while the 3V3 SW rail is off, because the LED is powered from it.

### ledOff()

```cpp
void ledOff();
```

Turns the LED off. Same as `led(0, 0, 0)`.

## Battery and power input

### batteryMillivolts()

```cpp
uint16_t batteryMillivolts(uint8_t samples = 16);
```

Returns the battery voltage in millivolts. It takes `samples` readings and averages them. The default of 16 is a good balance.

```cpp
Serial.printf("Battery: %u mV\n", LorNode.batteryMillivolts());
```

On boards shipped so far the reading stops at about 3950 mV. See `batterySaturated()`.

### batteryPercent()

```cpp
uint8_t batteryPercent();
```

Returns a rough charge level from 0 to 100, worked out from the voltage with a typical Li-ion curve. It is a guide, not a fuel gauge. It is most accurate when the battery is resting.

### batterySaturated()

```cpp
bool batterySaturated();
```

Returns `true` when the battery reading has hit the top of what the board can measure. On boards with R16 = 44.2k that happens above roughly 3.95 V. When it is `true`, read `batteryMillivolts()` as "at least this much".

### externalPower()

```cpp
bool externalPower();
```

Returns `true` when 5 V is present on USB-C or the CHG IN pads. It can't tell you whether the battery is still charging or already full.

### calibrateBattery(mV)

```cpp
bool calibrateBattery(uint16_t measuredMillivolts);
```

Saves a correction for the battery reading. Measure the battery with a multimeter while it is between 3.4 V and 3.9 V, and pass the result in millivolts:

```cpp
LorNode.calibrateBattery(3760);
```

The correction is stored in flash and used from then on, including after resets and new uploads. Returns `false` and saves nothing if the reading is capped, or if the correction would be more than 20% either way. The full steps are in [Power and battery](/docs/lornode/power-and-battery#calibrating-with-a-multimeter).

### clearBatteryCalibration()

```cpp
void clearBatteryCalibration();
```

Removes the saved correction.

### batteryCalibration()

```cpp
float batteryCalibration() const;
```

Returns the correction factor in use. `1.0` means no correction.

## Deep sleep

### sleepFor()

```cpp
[[noreturn]] void sleepFor(uint32_t seconds, bool keepPeripherals = false);
```

Goes to deep sleep for `seconds`. First it puts the radio to sleep and switches the 3V3 SW rail off, and it holds the rail off for the whole sleep.

```cpp
LorNode.sleepFor(60);  // see you in a minute
```

This call never returns. When the time is up, the board restarts from `setup()`.

Pass `true` as the second argument to leave the 3V3 SW rail on during sleep. The LED is switched off and the radio is put to sleep, but everything on the rail stays powered, so the board uses more power.

### sleepUntilPin()

```cpp
bool sleepUntilPin(uint8_t gpio, bool level, uint32_t timeoutSeconds = 0,
                   bool keepPeripherals = false);
```

Like `sleepFor()`, but the board wakes when a pin reaches a level. `level` is `true` for high and `false` for low.

```cpp
// Wake when a button pulls GPIO33 low, or after an hour, whichever is first.
LorNode.sleepUntilPin(33, false, 3600);
```

Things to know:

- Only RTC-capable pins can wake the board. On the headers, the free ones are GPIO2, 12, 14, 25, 26, 32, 33, 36 and 39. GPIO32 and GPIO33 are the easy choices.
- Give the pin an external pull-up or pull-down resistor so it has a definite level while the board sleeps.
- If you pass a pin that can't wake the board, `sleepUntilPin()` returns `false` straight away and the board stays awake. When it does sleep, it never returns.

### wakeReason()

```cpp
esp_sleep_wakeup_cause_t wakeReason() const;
```

Tells you why the board started. The useful values:

| Value                        | Meaning                                           |
| ---------------------------- | ------------------------------------------------- |
| `ESP_SLEEP_WAKEUP_TIMER`     | The sleep time ran out                            |
| `ESP_SLEEP_WAKEUP_EXT0`      | The wake pin from `sleepUntilPin()` fired         |
| `ESP_SLEEP_WAKEUP_UNDEFINED` | Not a wake-up. The board was powered on or reset. |

```cpp
if (LorNode.wakeReason() == ESP_SLEEP_WAKEUP_EXT0) {
  Serial.println("Woken by the button.");
}
```

### bootCount()

```cpp
uint32_t bootCount() const;
```

Returns how many times the board has started since it was powered up, counting every wake from deep sleep. The first boot is 1. It starts over when the board loses power or is reset.

## Pin constants

`LorNode.h` also gives you a name for every pin, so you don't have to remember numbers.

Pins the board uses:

| Constant                | GPIO | What it is          |
| ----------------------- | ---- | ------------------- |
| `LORNODE_LORA_NSS`      | 4    | LoRa chip select    |
| `LORNODE_LORA_RESET`    | 16   | LoRa reset          |
| `LORNODE_LORA_DIO0`     | 13   | LoRa DIO0 interrupt |
| `LORNODE_SPI_SCK`       | 18   | SPI clock           |
| `LORNODE_SPI_MISO`      | 19   | SPI MISO            |
| `LORNODE_SPI_MOSI`      | 23   | SPI MOSI            |
| `LORNODE_RGB_LED`       | 15   | RGB LED data        |
| `LORNODE_PERIPH_EN`     | 27   | 3V3 SW rail enable  |
| `LORNODE_BOOT_BUTTON`   | 0    | BOOT button         |
| `LORNODE_VIN_SENSE`     | 34   | 5 V input sense     |
| `LORNODE_BATTERY_SENSE` | 35   | Battery sense       |

Free header pins are named `LORNODE_GPIO2`, `LORNODE_GPIO5`, `LORNODE_GPIO12`, `LORNODE_GPIO14`, `LORNODE_GPIO17`, `LORNODE_GPIO21`, `LORNODE_GPIO22`, `LORNODE_GPIO25`, `LORNODE_GPIO26`, `LORNODE_GPIO32`, `LORNODE_GPIO33`, `LORNODE_GPIO36` and `LORNODE_GPIO39`. Check the [Pinout](/docs/lornode/pinout) for the cautions on each one.

You can use the BOOT button as a plain button in your sketch once the board is running:

```cpp
pinMode(LORNODE_BOOT_BUTTON, INPUT_PULLUP);
if (digitalRead(LORNODE_BOOT_BUTTON) == LOW) {
  // pressed
}
```

## Other constants

| Constant                   | Value     | What it is                                                                                                                                           |
| -------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LORNODE_LIBRARY_VERSION`  | `"0.1.0"` | Version of the library                                                                                                                               |
| `LORNODE_R16_OHMS`         | `44200`   | The R16 value the library assumes. Define it as `100000` in your build flags for a board with the revised resistor, or set `batteryTopOhms` instead. |
| `LORNODE_R16_SHIPPED_OHMS` | `44200`   | R16 on boards shipped so far                                                                                                                         |
| `LORNODE_R16_REVISED_OHMS` | `100000`  | R16 on future batches                                                                                                                                |
| `LORNODE_R10_OHMS`         | `160000`  | The bottom resistor of the battery divider                                                                                                           |
