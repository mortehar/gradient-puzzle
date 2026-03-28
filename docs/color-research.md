# Color Research Notes

This note documents the working hypotheses behind the in-app perceptual research panel and the internal board analysis helpers.

## Screenshot Audit

The commercial reference boards show a few repeated patterns:

- Readable boards usually have smooth local steps between neighboring cells, even when the total corner span is large.
- Many examples preserve a mostly ordered lightness trend along rows, columns, or both. The eye can follow that order even when hue rotates.
- The center is often slightly muted compared with the edges, but the stronger examples avoid a dramatic chroma collapse in the middle.
- Harder-looking boards do not simply maximize corner distance. Instead, they tend to introduce either darker corners, more hue rotation, or more cross-axis interaction while keeping the local gradient fairly even.
- Single-axis ramps are especially legible because neighboring steps are consistent and edge ramps remain smooth.

Working interpretation:

- Corner distance matters, but mainly as a source of available gradient range.
- The stronger predictor of readability is the size and consistency of local neighbor differences in the final solved grid.
- Boards become visually weak when neighbor steps are too small, and visually harsh when they are too uneven or too large.

Practical conclusion for this game:

- Do not maximize corner distance blindly.
- Prefer corner sets that form a structured two-axis gradient: each edge should read as its own smooth ramp, and the whole board should keep a mostly monotonic lightness cue.
- Avoid complementary corner pairings that create a desaturated or muddy center.
- Keep both horizontal and vertical neighbor steps visible so each tile position remains visually distinct.

## Measurement Model

The code measures the solved board in `Oklab`, not in HSL, because the player sees the final cell colors rather than the corner parameters.

Tracked board metrics:

- Horizontal, vertical, and combined neighbor-distance distributions
- Row and column lightness monotonicity with reversal counts
- Neighbor-distance variability via coefficient of variation
- Edge-ramp smoothness from changes in step size along each border
- Center chroma drop relative to edge chroma
- Corner span as a secondary metric

The in-app score is a heuristic, not a scientific truth. It rewards:

- Moderate median neighbor steps
- Low variability in neighbor steps
- Low lightness reversal rates
- Limited center chroma loss
- Smooth edge ramps

It penalizes boards that read as:

- `too flat`
- `muddy`
- `harsh`
- `mixed`

## External References

- [Bjorn Ottosson, "A perceptual color space for image processing"](https://bottosson.github.io/posts/oklab/)
  - Practical justification for using `Oklab` for smooth gradients and distance estimates.
- [CIE 217:2016, "Recommended Method for Evaluating the Performance of Colour-Difference Formulae"](https://cie.co.at/publications/recommended-method-evaluating-performance-colour-difference-formulae)
  - Helpful background on why perceptual color-difference formulas matter and why naive Euclidean spaces are unreliable.
- [Matplotlib, "Choosing Colormaps"](https://matplotlib.org/stable/users/explain/colors/colormaps.html)
  - Useful practical guidance on monotonic lightness and perceptually uniform steps for visual tasks.
- [Pecho et al., "Lightness, chroma and hue differences on visual shade matching"](https://pubmed.ncbi.nlm.nih.gov/27614615/)
  - A reminder that human matching performance is not equally sensitive to lightness, chroma, and hue components.

## How To Use This

- Use the settings sidebar research panel while adjusting corner color rules.
- Watch the current board score and the sample average together; a single board can look good by luck, but the sample average reveals whether the settings are robust.
- Treat the sweet-spot ranges as guide rails for the current configuration family, not as universal constants.
- The generator now searches for corner sets that maximize these perceptual metrics automatically, so the panel is mainly there as an explanation and a verification surface.
