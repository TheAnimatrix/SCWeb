---
title: Hardware files
description: The open source hardware files for LorNode V2, including the schematic, BOM, KiCad sources, gerbers and 3D model, plus board dimensions.
order: 8
---

# Hardware files

LorNode V2 is open hardware. Everything you need to study it, modify it or build your own is in the [`hardware/`](https://github.com/TheAnimatrix/LorNode/tree/main/hardware) folder of the repo.

## What's in the folder

| File                                                                                                                         | What it is for                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`lornode-v2-schematic.pdf`](https://github.com/TheAnimatrix/LorNode/blob/main/hardware/lornode-v2-schematic.pdf)            | The schematic as a PDF. Start here if you want to see how something is wired. No software needed.                                                                                                |
| [`lornode-v2-bom.csv`](https://github.com/TheAnimatrix/LorNode/blob/main/hardware/lornode-v2-bom.csv)                        | The bill of materials: every part, its value and its footprint.                                                                                                                                  |
| [`lornode-v2.step`](https://github.com/TheAnimatrix/LorNode/blob/main/hardware/lornode-v2.step)                              | A 3D model of the assembled board. Import it into your CAD program to design an enclosure around it.                                                                                             |
| [`kicad/`](https://github.com/TheAnimatrix/LorNode/tree/main/hardware/kicad)                                                 | The KiCad project: `esp_lora_iot.kicad_sch` (schematic), `esp_lora_iot.kicad_pcb` (board layout) and `esp_lora_iot.kicad_pro` (project file). Open the project file in KiCad to edit the design. |
| [`gerbers/lornode-v2-2022-10-20/`](https://github.com/TheAnimatrix/LorNode/tree/main/hardware/gerbers/lornode-v2-2022-10-20) | The manufacturing files: copper, solder mask, paste and silkscreen layers, the board outline, drill files, and pick-and-place position files for assembly.                                       |

## About the gerbers

The gerbers are the 2022 V2 production files.

The KiCad sources, the schematic PDF and the BOM are a little newer. The difference that matters: they list the battery divider resistor **R16 as 100k**, which is the value for future batches. Boards shipped so far were built with **44.2k** in that spot. If you build your own board, fit 100k. What this means for battery readings is covered in [Power and battery](/docs/lornode/power-and-battery#the-r16-story).

## The board

- **Size:** about 74 x 44 mm (73.9 x 43.6 mm).
- **Layers:** 2.
- **Mounting:** four M3 holes, one in each corner.
- **Breadboards:** the two headers are 36.35 mm apart and don't line up with each other, so the board won't sit across a breadboard. Use jumper wires instead.
- **Headers:** 2.54 mm (0.1 inch) pitch. 18 pins on the left, 15 on the right, and a 2 x 3 header for the LoRa DIO pins.

For exact hole positions and outline, use the STEP model or the KiCad board file. Don't measure from pictures.

## Main parts

| Part                      | Job                                             |
| ------------------------- | ----------------------------------------------- |
| ESP32-WROOM-32            | The microcontroller, with Wi-Fi and Bluetooth   |
| Ai-Thinker Ra-01 (SX1278) | LoRa radio, 433 MHz                             |
| CH340C                    | USB to serial                                   |
| TP4056                    | Li-ion charger                                  |
| FS312F + FS8205A          | Battery protection                              |
| RT9080 x 2                | 3.3 V regulators: one always on, one switchable |
| WS2812B                   | RGB LED                                         |

## The pinout is generated from these files

The [pinout diagram](/docs/lornode/pinout) and the pin names in the library are not drawn by hand. Scripts in [`tools/`](https://github.com/TheAnimatrix/LorNode/tree/main/tools) read the KiCad schematic and board file and produce `pinout/pinout.json`, the diagram and `src/LorNodePins.h`. If you change the design, run them again and the docs follow.

## Licence

The hardware and the software are both released under the MIT licence. You can use, change and sell what you build from them. Keep the copyright notice. See [LICENSE.md](https://github.com/TheAnimatrix/LorNode/blob/main/LICENSE.md) for the full text.
