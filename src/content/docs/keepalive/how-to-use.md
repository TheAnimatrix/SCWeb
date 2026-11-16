---
title: How to use it
description: Wire KeepAlive between a power bank and your circuit, pick the right output pin, set the jumpers and read the LED.
order: 2
---

# How to use it

> **This board hasn't been built yet**, so nothing on this page has been tried on real hardware. It describes how the design is meant to be used.

## What you need

- A KeepAlive module.
- A power bank with a USB-C or USB-A output.
- A cable from the power bank to USB-C.
- Your circuit, with its 5 V and ground wires.

## 1. Connect it

1. Plug the module into a breadboard, or solder it flat onto your own board using the castellated pads.
2. Connect your circuit's ground to any `GND` pin.
3. Connect your circuit's 5 V input to an `OUT` pin.
4. Plug the cable from the power bank into the module's USB-C socket.

Nothing happens for the first 2 seconds after power is applied. After that the LED starts to show what the module is doing.

## 2. Pick the right pin

There are two 5 V outputs, and the difference matters.

| Pin   | Where                         | What it is                                                                                                                                           |
| ----- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OUT` | second from bottom, both rows | 5 V through a 0.1 Ω shunt, rated for 1 A. **This is the measured output.** Connect your circuit here. It drops 0.1 V per amp.                        |
| `5V`  | bottom pin, both rows         | 5 V straight from the power bank, up to 3 A. Not measured: a load here does not stop the pulses.                                                     |
| `EN`  | right row, third from bottom  | Leave open to run. Pull to `GND` to switch the keep-alive off. Drive it open-drain only, and never above 5 V. It is the microcontroller's reset pin. |
| `NC`  | left row, third from bottom   | Not connected. It keeps `OUT` from sitting next to a ground pin, so a solder bridge between neighbours cannot short the supply.                      |
| `GND` | every other pin               | Ground, including the two pairs beside the USB-C socket.                                                                                             |

Use `OUT` for anything under 1 A. The module then knows how much your circuit draws and stays quiet whenever that is enough to keep the bank awake.

Use `5V` only for a load above 1 A. The module cannot see that load, so it keeps pulsing as if nothing were connected.

## 3. Read the LED

| LED                            | Meaning                                           |
| ------------------------------ | ------------------------------------------------- |
| A long flash                   | The module is pulsing to keep the bank awake.     |
| A short blip every few seconds | Your circuit draws enough. The pulse was skipped. |
| No light at all                | No power, or `EN` is held low.                    |

## 4. Set the jumpers if you need to

Start with all three jumpers open. Only change them if the bank still switches off, or if it stays on and you want to save power.

| Jumper                | Pulse                       | Average draw at idle |
| --------------------- | --------------------------- | -------------------- |
| All open (default)    | 100 mA for 250 ms every 5 s | 5.1 mA               |
| `ECO` (JP1) bridged   | 100 ms every 10 s           | 1.0 mA               |
| `MAX` (JP3) bridged   | 750 ms every 5 s            | 15 mA                |
| `200mA` (JP2) bridged | 200 mA instead of 100 mA    | twice the above      |

To bridge a jumper, put a blob of solder across its two pads. `ECO` and `MAX` are read when power is applied or when `EN` is released, so unplug and replug after changing them.

- **The bank still switches off:** bridge `200mA`. If that isn't enough, bridge `MAX` as well.
- **The bank stays on and you want it to last longer:** try `ECO`.
- Bridge `ECO` or `MAX`, not both. Bridging both does no harm; the module picks one of the two.

## 5. Switch it off from your own circuit

Pull `EN` to ground and the module stops pulsing and the LED goes out. Release it and the module starts again after 2 seconds. Use an open-drain output or a transistor for this. Don't drive `EN` high from a pin, and never above 5 V.

## Limits

- `OUT` is rated for 1 A and `5V` for 3 A.
- The threshold is about 200 mA, give or take 40 mA. It follows the supply voltage, so it sits about 10 % lower at 4.5 V.
- A dead short on `OUT` runs through the shunt, which is a 2 W part and survives 3 A indefinitely. A dead short on `5V` is limited only by the power bank's own protection.
- The module does not boost, regulate or charge anything. What comes out is the bank's 5 V.

## If it doesn't work

- **No LED at all.** Check the cable carries power, and that `EN` is not connected to ground.
- **The bank switches off anyway.** Bridge `200mA`, then `MAX`. Some banks need more current or a longer pulse than the default.
- **The LED flashes long even with your circuit running.** Your circuit is on the `5V` pin, or it draws under about 200 mA. Under 200 mA the pulses are doing their job; leave it.
