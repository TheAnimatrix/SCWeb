# Blog illustration prompts

The four blog covers are line drawings made with an AI image tool on 2026-11-15. Each one is credited
on its post ("Illustration made with an AI image tool."). They replaced an earlier set of pencil-style
scenes with people, which read as generic and sat badly on the dark page.

## Files

| Post                                                | Cover                                   | Share image                               |
| --------------------------------------------------- | --------------------------------------- | ----------------------------------------- |
| `why-india-needs-selfcrafted`                       | `static/images/blog/board-and-box.webp` | `static/images/blog/board-and-box-og.jpg` |
| `a-product-studio-for-the-ai-era`                   | `.../sketch-and-object.webp`            | `.../sketch-and-object-og.jpg`            |
| `what-to-document-before-you-ship-your-first-build` | `.../device-and-guide.webp`             | `.../device-and-guide-og.jpg`             |
| `a-useful-part-deserves-a-second-life`              | `.../parts-organiser.webp`              | `.../parts-organiser-og.jpg`              |

`static/images/og-default.jpg` is a copy of the board-and-box share image, used as the site's default
link preview.

## How they are prepared

1. Generate at 1536×1024 with the prompt below.
2. Convert to black ink on a transparent background, 1400×933 WebP (alpha taken from darkness). Set
   `lineArt: true` on the cover so the page inverts it in the dark theme.
3. Make a 1200×630 JPEG with white lines on near-black (`#0a0a0a`) for link previews, and set it as
   `ogSrc`. Transparent images turn into a black rectangle in most chat previews.

## Shared style (goes in every prompt)

> Technical line illustration in the style of an assembly-manual drawing. Crisp black ink lines on a
> pure white background. Consistent thin line weight with slightly heavier outer contours. No shading,
> no grey tones, no gradients, no colour, no paper texture, no drop shadows, no background scene or
> horizon line. No text, letters, numbers, labels, arrows or logos anywhere. No people, no hands. A
> single group of objects centred in the frame with wide empty margins on all sides. Every object must
> be mechanically plausible: parts that would really fit together, correct proportions, no merged or
> melted shapes. Landscape, 3:2 aspect ratio. Three-quarter isometric view from above.

## Subjects

**board-and-box.** A small rectangular electronics development board about the size of a matchbox: two
square shielded radio modules, a row of pin headers along each long edge, a USB-C socket on one short
edge, four round mounting holes at the corners, and a short coiled spring antenna standing upright from
one corner. Beside it, a small open corrugated cardboard shipping box with its flaps up.

**sketch-and-object.** A sheet of paper carrying a loose hand sketch of a small wedge-shaped desk gadget
with a rectangular screen and one round knob. Lying next to the paper: a digital caliper, and the same
wedge-shaped gadget as a finished solid object, so the drawing and the object can be compared.

**device-and-guide.** A small box-shaped electronic device with one round button on top and a USB-C
socket on its front face, standing next to its opened retail carton. In front of it lies a single
unfolded instruction sheet showing three simple step diagrams as plain outline pictures (no writing).
Beside the sheet: four identical hex-socket cap screws in a row and one L-shaped hex key.

**parts-organiser.** A rectangular plastic parts organiser with its hinged lid open and twelve
compartments in a three by four grid. Each compartment holds one kind of part: hex-socket screws, brass
threaded standoffs, a small stepper motor, a cylindrical heater cartridge with two wires, a small square
cooling fan, a coil of wire, toggle switches, round knobs. A few compartments are empty.

## Checking a new image before using it

Reject it if it has any lettering, grey shading, people or hands, or an object that couldn't exist
(connectors that don't match, screws with nowhere to go). A plain correct drawing is the goal.
