const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const Database = require("./db.js");
require('dotenv').config();

const db = new Database();
const filePath = process.env.FILE_PATH;
const fontPath = process.env.FONT_PATH;
const fileName = 'completion.png';
const completeFilePath = path.join(filePath, fileName);

if (fontPath) {
  console.log(fontPath)
  registerFont(fontPath, { family: 'Aller' });
}

const font = 'Aller';

async function fetchData() {
    await db.connect();
    const packs_query = `
    SELECT
    CAST(REPLACE(pack_id, 'S', '') AS INTEGER) AS pack_number,
    COUNT(DISTINCT scores.beatmap_id) AS scores_count,
    COUNT(DISTINCT beatmap_packs.beatmap_id) AS beatmap_count
  FROM 
    beatmap_packs 
    LEFT JOIN beatmaps ON beatmaps.beatmap_id = beatmap_packs.beatmap_id
    LEFT JOIN scores ON scores.beatmap_id = beatmaps.beatmap_id AND scores.user_id = 1023489
  WHERE 
    pack_id ~ '^S\\d+$' AND 
    CAST(REPLACE(pack_id, 'S', '') AS INTEGER) BETWEEN 1 AND 200
    AND mode = 0 AND approved in (1,2)
  GROUP BY 
    pack_id
  ORDER BY 
    pack_number
    `
    const packs_rows = await db.query(packs_query);

    const packs_compltion_query = `
    SELECT
    COUNT(DISTINCT scores.beatmap_id) AS scores_count,
    COUNT(DISTINCT beatmaps.beatmap_id) AS beatmap_count
    FROM beatmaps
    LEFT JOIN scores ON scores.beatmap_id = beatmaps.beatmap_id AND scores.user_id = 1023489
    LEFT JOIN beatmap_packs ON beatmap_packs.beatmap_id = beatmaps.beatmap_id
    WHERE mode = 0 AND approved in (1,2)
    AND pack_id ~ '^S\\d+$' AND 
    CAST(REPLACE(pack_id, 'S', '') AS INTEGER) BETWEEN 1 AND 200`

    const packs_completion_rows = await db.query(packs_compltion_query);

    const years_query = `
    SELECT
    EXTRACT(YEAR FROM beatmaps.approved_date) AS year,
    COUNT(DISTINCT scores.beatmap_id) AS scores_count,
    COUNT(DISTINCT beatmaps.beatmap_id) AS beatmap_count
  FROM
    beatmaps
    LEFT JOIN scores ON scores.beatmap_id = beatmaps.beatmap_id AND scores.user_id = 1023489
  WHERE
    EXTRACT(YEAR FROM beatmaps.approved_date) BETWEEN 2007 AND 2011
    AND mode = 0 AND approved IN (1,2)
  GROUP BY
    year
  ORDER BY
    year
    `
    const years_rows = await db.query(years_query);

    const compltion_query = `
    SELECT
    COUNT(DISTINCT scores.beatmap_id) AS scores_count,
    COUNT(DISTINCT beatmaps.beatmap_id) AS beatmap_count
    FROM beatmaps
    LEFT JOIN scores ON scores.beatmap_id = beatmaps.beatmap_id AND scores.user_id = 1023489
    LEFT JOIN beatmap_packs ON beatmap_packs.beatmap_id = beatmaps.beatmap_id
    WHERE mode = 0 AND approved in (1,2)
    AND approved_date < '2011-08-11'`

    const completion_rows = await db.query(compltion_query);

    await db.disconnect();
    
    const data = { beatmap_packs: {} };
    for (let i = 0; i < packs_rows.length; i++) {
      const row = packs_rows[i];
      const packId = row.pack_number;
      data.beatmap_packs[packId] = {
        scores_count: row.scores_count,
        beatmap_count: row.beatmap_count,
      };
    }

    const packs_completion_row = packs_completion_rows[0]
    data.packs_completion = {
      scores_count: packs_completion_row.scores_count,
      beatmap_count: packs_completion_row.beatmap_count,
    }

    data.years = []
    for (let i = 0; i < years_rows.length; i++) {
      const row = years_rows[i];
      data.years.push({
        year: row.year,
        scoresCount: row.scores_count,
        beatmapCount: row.beatmap_count,
      });
    }

    const completion_row = completion_rows[0]
    data.completion = {
      scoresCount: completion_row.scores_count,
      beatmapCount: completion_row.beatmap_count,
    }
    //console.log(data)

    return data;
}

function formatNumber(number) {
  const numberValue = Number(number);
  if (isNaN(numberValue)) {
    // If the input is not a valid number, return the original value
    return number;
  }
  return numberValue.toLocaleString('en-US');
}

function defineRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
}

function drawHeader(ctx) {
    const headerText = 'Join Date Completion';
    const headerFontSize = 72;
    const headerFontColor = 'white';
    const headerFont = `bold ${headerFontSize}px ${font}`;

    // Save the current shadow settings
    const { shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY } = ctx;

    // Set the shadow effect for the header text
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'black';
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    ctx.font = headerFont;
    ctx.fillStyle = headerFontColor;
    ctx.textAlign = 'center';
    ctx.fillText(headerText, 890, 100);

    // Reset the shadow settings
    ctx.shadowBlur = shadowBlur;
    ctx.shadowColor = shadowColor;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
}

function drawPackCompletion(ctx) {
    const headerText = 'Beatmap Packs';
    const headerFontSize = 42;
    const headerFontColor = 'white';
    const headerFont = `bold ${headerFontSize}px ${font}`;
  
    // Save the current shadow settings
    const { shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY } = ctx;
  
    // Set the shadow effect for the header text
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'black';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  
    ctx.font = headerFont;
    ctx.fillStyle = headerFontColor;
    ctx.textAlign = 'center';
    ctx.fillText(headerText, 445, 170);
  
    // Reset the shadow settings
    ctx.shadowBlur = shadowBlur;
    ctx.shadowColor = shadowColor;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
}

function drawYears(ctx) {
    const headerText = 'Years';
    const headerFontSize = 42;
    const headerFontColor = 'white';
    const headerFont = `bold ${headerFontSize}px ${font}`;
  
    // Save the current shadow settings
    const { shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY } = ctx;
  
    // Set the shadow effect for the header text
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'black';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  
    ctx.font = headerFont;
    ctx.fillStyle = headerFontColor;
    ctx.textAlign = 'center';
    ctx.fillText(headerText, 1335, 170);
  
    // Reset the shadow settings
    ctx.shadowBlur = shadowBlur;
    ctx.shadowColor = shadowColor;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
}

function drawDivider(ctx,) {
    const { shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY } = ctx;
  
    // Set the shadow effect for the line
    ctx.shadowBlur = 3;
    ctx.shadowColor = 'black';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  
    // Draw the line
    ctx.beginPath();
    ctx.moveTo(890, 150);
    ctx.lineTo(890, 700);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'white';
    ctx.stroke();
  
    // Reset the shadow settings
    ctx.shadowBlur = shadowBlur;
    ctx.shadowColor = shadowColor;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
}
  
function drawPackSquares(ctx, data) {
    const boxWidth = 32;
    const boxHeight = 32;
    const gap = 5;
    const rows = 10;
    const cols = 20;
    const startX = (890 - (cols * (boxWidth + gap)) + gap) / 2 + 40;
    const startY = 200;
    const labelGap = 10;
    const size = 32;
  
    for (let row = 0; row < rows; row++) {
        const rowStart = row * cols + 1;
        const rowEnd = rowStart + cols - 1;
        const labelX = startX - labelGap;
        const labelY = startY + row * (boxHeight + gap) + boxHeight / 2 + 6;

        const { shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY } = ctx;

        // Set the shadow effect for the line
        ctx.shadowBlur = 3;
        ctx.shadowColor = 'black';
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Draw the row label
        ctx.font = `bold 18px ${font}`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'right';
        ctx.fillText(`${rowStart}-${rowEnd}`, labelX, labelY);

        // Reset the shadow settings
        ctx.shadowBlur = shadowBlur;
        ctx.shadowColor = shadowColor;
        ctx.shadowOffsetX = shadowOffsetX;
        ctx.shadowOffsetY = shadowOffsetY;

        for (let col = 0; col < cols; col++) {
            const x = startX + col * (boxWidth + gap);
            const y = startY + row * (boxHeight + gap);
            const packNumber = row * cols + col + 1;
            const packData = data[packNumber];
            const scorePercent = packData?.beatmap_count ? packData.scores_count / packData.beatmap_count : 0;

            // Draw the square
            ctx.fillStyle = `hsl(${scorePercent * 115}, 80%, 50%)`;
            defineRoundedRect(ctx, x, y, boxWidth, boxHeight, 5);
            ctx.fill();

            // create a gradient for the reflection
            const gradient = ctx.createLinearGradient(x, y, x, y + size);
            
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            // fill the square with the gradient
            ctx.fillStyle = gradient;
            ctx.fill();

            // Draw the pack number on top of the square
            // ctx.fillStyle = 'black';
            // ctx.font = `16px ${font}`;
            // ctx.textAlign = 'center';
            // ctx.fillText(packNumber, x + boxWidth/2, y + boxHeight/2 + 2);

        }
    }
}

function drawPacksProgressbar(ctx, data) {
    const completionPercentage = data.scores_count / data.beatmap_count * 100;
    const hue = completionPercentage / 100 * 115;

    // Define the progress bar dimensions
    const barWidth = 890 * 0.917;
    const barHeight = 32;
    const barX = (890 - barWidth) / 2;
    const barY = 630 - barHeight ;
    const filledWidth = (barWidth * completionPercentage) / 100;

    // Set up the shadow effect for the progress bar background
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 1;

    // Draw the progress bar background with rounded corners
    defineRoundedRect(ctx, barX, barY, barWidth, barHeight, 5);
    ctx.fill();

    // Reset the shadow settings
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Draw the filled progress bar
    ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
    defineRoundedRect(ctx, barX, barY, filledWidth, barHeight, 5);
    ctx.fill();

    // Define the gradient for the filled progress bar
    const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
    gradient.addColorStop(0, 'hsla(0, 0%, 100%, 0.3)');
    gradient.addColorStop(0.5, 'hsla(0, 0%, 100%, 0)');
    gradient.addColorStop(1, 'hsla(0, 0%, 100%, 0.3)');

    // Draw the reflection gradient
    ctx.fillStyle = gradient;
    defineRoundedRect(ctx, barX, barY, filledWidth, barHeight, 5);
    ctx.fill();

    // Draw the text with shadow in the middle of the progress bar
    const text = `${completionPercentage.toFixed(2)}% ~ ${formatNumber(data.scores_count)} / ${formatNumber(data.beatmap_count)}`;
    const textX = barX + barWidth / 2;
    const textY = barY + barHeight / 2;

    ctx.font = `bold 22px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Set up the shadow effect for the text
    ctx.shadowColor = 'black';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 3;

    // Draw the text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, textX, textY);

    // Reset the shadow settings
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
}

function drawLegend(ctx) {
    // Set up the shadow effect for the text
    ctx.shadowColor = 'black';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 4;

    // Draw the text
    ctx.font = `bold 25px ${font}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText("Less Clears", 120, 680);
    ctx.fillText("More Clears", 750, 680);

    // Reset the shadow settings
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;

    const squares = [
        {x: 240, hue: 0},
        {x: 360, hue: 28},
        {x: 480, hue: 57},
        {x: 600, hue: 115}
    ]

    for (const square of squares) {
        ctx.fillStyle = `hsl(${square.hue}, 80%, 50%)`;
        defineRoundedRect(ctx, square.x, 665, 32, 32, 5);
        ctx.fill();

        const gradient = ctx.createLinearGradient(square.x, 665, square.x, 665 + 32);

        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

function drawYearsProgressbars(ctx, yearsData) {
    const startX = 990;
    const startY = 200;
    const barWidth = 730;
    const barHeight = 32;
    const barMargin = 51;

    for (let i = 0; i < yearsData.length; i++) {
      const yearData = yearsData[i];
      const { year, scoresCount, beatmapCount } = yearData;
      const completionPercentage = scoresCount / beatmapCount * 100;

      const barX = startX;
      const barY = startY + (barHeight + barMargin) * i;
      const filledWidth = (barWidth * completionPercentage) / 100;

      // Draw the progress bar background with rounded corners
      defineRoundedRect(ctx, barX, barY, barWidth, barHeight, 5);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fill();

      // Draw the filled progress bar
      ctx.fillStyle = `hsl(${completionPercentage}, 80%, 50%)`;
      defineRoundedRect(ctx, barX, barY, filledWidth, barHeight, 5);
      ctx.fill();

      // Define the gradient for the filled progress bar
      const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
      gradient.addColorStop(0, 'hsla(0, 0%, 100%, 0.3)');
      gradient.addColorStop(0.5, 'hsla(0, 0%, 100%, 0)');
      gradient.addColorStop(1, 'hsla(0, 0%, 100%, 0.3)');

      // Draw the reflection gradient
      ctx.fillStyle = gradient;
      defineRoundedRect(ctx, barX, barY, filledWidth, barHeight, 5);
      ctx.fill();

      // Set up the shadow effect for the text
      ctx.shadowColor = 'black';
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 3;

      // Draw the year text
      ctx.font = `bold 22px ${font}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(year, barX - 35, barY + 15);

      // Draw the text with shadow in the middle of the progress bar
      const text = `${completionPercentage.toFixed(2)}% ~ ${formatNumber(scoresCount)} / ${formatNumber(beatmapCount)}`;
      const textX = barX + barWidth / 2;
      const textY = barY + barHeight / 2;

      ctx.font = `bold 22px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, textX, textY);

      // Reset the shadow settings
      ctx.shadowColor = 'transparent';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 0;
    }
}

function drawCompletionHeader(ctx) {
    const text = "Completion up to 2011-08-11";
    const barY = 200 + (32 + 51) * 4; // Y-coordinate of the 5th progress bar

    // Set the shadow effect for the header text
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'black';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.font = `bold 28px ${font}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(text, 1335, barY + 80);

    // Reset the shadow settings
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
}

function drawCompletionProgressbar(ctx, completionData) {
    const startX = 930;
    const startY = 200 + (32 + 51) * 4 + 130; // Y-coordinate below the completion header
    const barWidth = 790;
    const barHeight = 32;

    const completionPercentage = completionData.scoresCount / completionData.beatmapCount * 100;
    const filledWidth = (barWidth * completionPercentage) / 100;

    // Draw the progress bar background with rounded corners
    defineRoundedRect(ctx, startX, startY, barWidth, barHeight, 5);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();

    // Draw the filled progress bar
    ctx.fillStyle = `hsl(${completionPercentage}, 80%, 50%)`;
    defineRoundedRect(ctx, startX, startY, filledWidth, barHeight, 5);
    ctx.fill();

    // Define the gradient for the filled progress bar
    const gradient = ctx.createLinearGradient(startX, startY, startX, startY + barHeight);
    gradient.addColorStop(0, 'hsla(0, 0%, 100%, 0.3)');
    gradient.addColorStop(0.5, 'hsla(0, 0%, 100%, 0)');
    gradient.addColorStop(1, 'hsla(0, 0%, 100%, 0.3)');

    // Draw the reflection gradient
    ctx.fillStyle = gradient;
    defineRoundedRect(ctx, startX, startY, filledWidth, barHeight, 5);
    ctx.fill();

    // Set up the shadow effect for the text
    ctx.shadowColor = 'black';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 3;

    // Draw the text with shadow in the middle of the progress bar
    const text = `${completionPercentage.toFixed(2)}% ~ ${formatNumber(completionData.scoresCount)} / ${formatNumber(completionData.beatmapCount)}`;
    const textX = startX + barWidth / 2;
    const textY = startY + barHeight / 2;

    ctx.font = `bold 22px ${font}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, textX, textY);

    // Reset the shadow settings
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
}

async function createImage() {
    const data = await fetchData();

    // Create canvas
    const canvas = createCanvas(1780, 760);
    const ctx = canvas.getContext('2d');

    // Set background color to transparent
    ctx.fillStyle = 'rgba(0,0,0,0)';
    //ctx.fillStyle = 'rgba(56, 46, 50, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawHeader(ctx);
    drawPackCompletion(ctx);
    drawDivider(ctx);
    drawYears(ctx);
    drawPackSquares(ctx, data.beatmap_packs);
    drawPacksProgressbar(ctx, data.packs_completion);
    drawLegend(ctx)
    drawYearsProgressbars(ctx, data.years)
    drawCompletionHeader(ctx)
    drawCompletionProgressbar(ctx, data.completion)

    // Save PNG file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(completeFilePath, buffer);
    console.log('The PNG file was created.');
}

createImage();
