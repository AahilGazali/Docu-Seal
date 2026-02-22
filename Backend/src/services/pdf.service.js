const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const FONT_STYLE_MAP = {
  // Standard styles
  formal: StandardFonts.TimesRoman,
  simple: StandardFonts.Helvetica,
  bold: StandardFonts.HelveticaBold,
  classic: StandardFonts.Courier,
  // Cursive/italic styles - different fonts for visual distinction
  cursive1: StandardFonts.TimesRomanItalic,
  cursive2: StandardFonts.HelveticaOblique,
  cursive3: StandardFonts.CourierOblique,
  cursive4: StandardFonts.HelveticaBoldOblique,
  // Additional distinct styles
  elegant: StandardFonts.TimesRomanBold,
  modern: StandardFonts.Helvetica,
  script: StandardFonts.TimesRomanItalic,
  casual: StandardFonts.HelveticaOblique,
  professional: StandardFonts.TimesRoman,
  artistic: StandardFonts.CourierBoldOblique,
  refined: StandardFonts.TimesRomanBoldItalic,
  sleek: StandardFonts.HelveticaBold,
};

const COLOR_MAP = {
  black: { r: 0, g: 0, b: 0 },
  red: { r: 0.933, g: 0.267, b: 0.267 }, // #EF4444
  blue: { r: 0.231, g: 0.510, b: 0.965 }, // #3B82F6
  green: { r: 0.063, g: 0.725, b: 0.506 }, // #10B981
};

async function embedSignatureText(pdfBuffer, signaturesWithLabels, fontStyle, signatureColor = 'black') {
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('Invalid PDF buffer');
  }
  if (!signaturesWithLabels || signaturesWithLabels.length === 0) {
    throw new Error('No signatures to embed');
  }

  const doc = await PDFDocument.load(pdfBuffer);
  const pages = doc.getPages();
  if (pages.length === 0) {
    throw new Error('PDF has no pages');
  }

  const fontKey = fontStyle && FONT_STYLE_MAP[fontStyle] ? fontStyle : 'simple';
  const font = doc.embedStandardFont(FONT_STYLE_MAP[fontKey]);
  const color = COLOR_MAP[signatureColor] || COLOR_MAP.black;

  let drawnCount = 0;
  for (const { pageIndex, x, y, label } of signaturesWithLabels) {
    if (pageIndex < 0 || pageIndex >= pages.length) {
      console.warn(`Skipping signature: invalid page index ${pageIndex}`);
      continue;
    }
    const page = pages[pageIndex];
    const { width, height } = page.getSize();
    
    // Font size varies by style for visual distinction
    let baseFontSize = Math.max(16, Math.min(22, width * 0.035));
    let fontSize = baseFontSize;
    
    // Adjust font size based on style for visual variety
    if (fontKey.includes('bold') || fontKey === 'elegant' || fontKey === 'professional') {
      fontSize = baseFontSize * 0.95; // Slightly smaller for bold styles
    } else if (fontKey === 'artistic' || fontKey === 'refined' || fontKey === 'script') {
      fontSize = baseFontSize * 1.05; // Slightly larger for decorative styles
    } else if (fontKey === 'casual' || fontKey === 'modern') {
      fontSize = baseFontSize * 1.02; // Slightly larger for casual/modern
    } else {
      fontSize = baseFontSize; // Standard size for others
    }
    
    // Convert overlay percentage coordinates to PDF coordinates
    // Overlay: (x, y) is top-left corner of signature box in %; PDF: (x, y) is bottom-left origin in points
    const numX = Number(x);
    const numY = Number(y);
    const hasValidCoords = Number.isFinite(numX) && Number.isFinite(numY);
    
    if (!hasValidCoords) {
      console.warn(`[PDF] Invalid coordinates for signature: x=${x}, y=${y}`);
      continue;
    }
    
    // X: percentage from left -> PDF x coordinate
    // The overlay x is the left edge of the signature box, add small padding for text
    const textX = (numX / 100) * width + 5;
    
    // Y: percentage from top -> PDF y coordinate (PDF origin is bottom-left)
    // Overlay y is percentage from top (0% = top, 100% = bottom)
    // PDF y is from bottom (0 = bottom, height = top)
    // Conversion: PDF_y = height - (overlay_y_percent / 100) * height
    
    // The signature box overlay is visually ~50-60px tall in the browser
    // We need to estimate the box height in PDF points
    // Signature boxes are typically 1.8-2.2x the font size in height
    const boxHeight = fontSize * 2.0;
    
    // Calculate the top of the signature box in PDF coordinates
    // overlay y% from top -> PDF: height - (y% * height)
    const boxTopY = height - (numY / 100) * height;
    
    // Calculate the bottom of the signature box
    const boxBottomY = boxTopY - boxHeight;
    
    // Place text baseline near the bottom-middle of the box (about 15% up from bottom)
    // This ensures the signature text appears within the visible box area
    const textBaselineOffsetFromBottom = boxHeight * 0.15;
    const textYRaw = boxBottomY + textBaselineOffsetFromBottom;
    
    // Clamp to ensure text is visible on page (at least fontSize from bottom, at least 10 from top)
    const safeY = Math.max(fontSize + 5, Math.min(height - 15, textYRaw));
    const safeX = Math.max(5, Math.min(width - 150, textX));
    
    // Get the text to draw before using it in console.log
    const textToDraw = String(label || 'Signed').trim();
    if (!textToDraw) continue;
    
    console.log(`[PDF] Signature "${textToDraw}" at overlay (${numX.toFixed(1)}%, ${numY.toFixed(1)}%) -> PDF (${safeX.toFixed(1)}, ${safeY.toFixed(1)}) on page ${pageIndex + 1}, boxTop=${boxTopY.toFixed(1)}, boxBottom=${boxBottomY.toFixed(1)}, fontSize=${fontSize.toFixed(1)}, boxHeight=${boxHeight.toFixed(1)}`);

    try {
      // Draw signature text - larger, colored, more visible (no underline)
      page.drawText(textToDraw, {
        x: safeX,
        y: safeY,
        size: fontSize,
        color: rgb(color.r, color.g, color.b),
        font,
      });
      
      drawnCount++;
      console.log(`Drew signature "${textToDraw}" at (${safeX.toFixed(1)}, ${safeY.toFixed(1)}) on page ${pageIndex + 1}, size ${fontSize}pt`);
    } catch (err) {
      console.error(`Failed to draw signature text at (${safeX}, ${safeY}):`, err);
    }
  }

  if (drawnCount === 0) {
    throw new Error('No signatures were successfully drawn on the PDF');
  }

  const pdfBytes = await doc.save();
  if (!pdfBytes || pdfBytes.length === 0) {
    throw new Error('Failed to save PDF after embedding signatures');
  }

  return pdfBytes;
}

module.exports = { embedSignatureText };
