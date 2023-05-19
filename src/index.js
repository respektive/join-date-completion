const { createCanvas, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");
const Database = require("./db.js");
require("dotenv").config();

const db = new Database();
const filePath = process.env.FILE_PATH;
const fontPath = process.env.FONT_PATH;
const users = [
    {
        user_id: 1023489,
        date: "2011-08-11",
    },
    {
        user_id: 9991650,
        date: "2014-01-26",
    },
];

if (fontPath) {
    console.log(fontPath);
    registerFont(fontPath, { family: "Aller" });
}

const font = "Aller";

async function fetchData(user) {
    const year = new Date(user.date).getFullYear();

    const packs_query = `
    SELECT
    CAST(REPLACE(pack_id, 'S', '') AS INTEGER) AS pack_number,
    COUNT(DISTINCT scores.beatmap_id) AS scores_count,
    COUNT(DISTINCT beatmap_packs.beatmap_id) AS beatmap_count
    FROM 
    beatmap_packs 
    LEFT JOIN beatmaps ON beatmaps.beatmap_id = beatmap_packs.beatmap_id
    LEFT JOIN scores ON scores.beatmap_id = beatmaps.beatmap_id AND scores.user_id = ${user.user_id}
    WHERE 
    pack_id ~ '^S\\d+$' AND 
    approved_date <= '${user.date}'
    AND mode = 0 AND approved in (1,2)
    GROUP BY 
    pack_id
    ORDER BY 
    pack_number
    `;
    const packs_rows = await db.query(packs_query);

    const approved_packs_query = `
    SELECT
    CAST(REPLACE(pack_id, 'SA', '') AS INTEGER) AS pack_number,
    COUNT(DISTINCT scores.beatmap_id) AS scores_count,
    COUNT(DISTINCT beatmap_packs.beatmap_id) AS beatmap_count
    FROM 
    beatmap_packs 
    LEFT JOIN beatmaps ON beatmaps.beatmap_id = beatmap_packs.beatmap_id
    LEFT JOIN scores ON scores.beatmap_id = beatmaps.beatmap_id AND scores.user_id = ${user.user_id}
    WHERE 
    pack_id ~ '^SA\\d+$' 
    AND mode = 0
    GROUP BY 
    pack_id
    ORDER BY 
    pack_number
    `;

    const approved_packs_rows = await db.query(approved_packs_query);

    const years_query = `
    SELECT
    EXTRACT(YEAR FROM beatmaps.approved_date) AS year,
    COUNT(DISTINCT scores.beatmap_id) AS scores_count,
    COUNT(DISTINCT beatmaps.beatmap_id) AS beatmap_count
    FROM
    beatmaps
    LEFT JOIN scores ON scores.beatmap_id = beatmaps.beatmap_id AND scores.user_id = ${user.user_id}
    WHERE
    EXTRACT(YEAR FROM beatmaps.approved_date) BETWEEN 2007 AND ${year}
    AND mode = 0 AND approved IN (1,2)
    GROUP BY
    year
    ORDER BY
    year
    `;
    const years_rows = await db.query(years_query);

    const compltion_query = `
    SELECT
    COUNT(DISTINCT scores.beatmap_id) AS scores_count,
    COUNT(DISTINCT beatmaps.beatmap_id) AS beatmap_count
    FROM beatmaps
    LEFT JOIN scores ON scores.beatmap_id = beatmaps.beatmap_id AND scores.user_id = ${user.user_id}
    LEFT JOIN beatmap_packs ON beatmap_packs.beatmap_id = beatmaps.beatmap_id
    WHERE mode = 0 AND approved in (1,2)
    AND approved_date <= '${user.date}'`;

    const completion_rows = await db.query(compltion_query);

    const data = { beatmap_packs: [] };
    for (let i = 0; i < packs_rows.length; i++) {
        const row = packs_rows[i];
        data.beatmap_packs.push({
            pack_id: row.pack_number,
            scores_count: row.scores_count,
            beatmap_count: row.beatmap_count,
        });
    }

    data.approved_packs = [];
    for (let i = 0; i < approved_packs_rows.length; i++) {
        const row = approved_packs_rows[i];
        data.approved_packs.push({
            pack_id: row.pack_number,
            scores_count: row.scores_count,
            beatmap_count: row.beatmap_count,
        });
    }

    data.years = [];
    for (let i = 0; i < years_rows.length; i++) {
        const row = years_rows[i];
        data.years.push({
            year: row.year,
            scoresCount: row.scores_count,
            beatmapCount: row.beatmap_count,
        });
    }

    const completion_row = completion_rows[0];
    data.completion = {
        scoresCount: completion_row.scores_count,
        beatmapCount: completion_row.beatmap_count,
    };
    //console.log(data)

    return data;
}

function formatNumber(number) {
    const numberValue = Number(number);
    if (isNaN(numberValue)) {
        // If the input is not a valid number, return the original value
        return number;
    }
    return numberValue.toLocaleString("en-US");
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

function drawPackCompletion(ctx) {
    const headerText = "Beatmap Packs";
    const headerFontSize = 42;
    const headerFontColor = "white";
    const headerFont = `bold ${headerFontSize}px ${font}`;

    // Save the current shadow settings
    const { shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY } = ctx;

    // Set the shadow effect for the header text
    ctx.shadowBlur = 5;
    ctx.shadowColor = "black";
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.font = headerFont;
    ctx.fillStyle = headerFontColor;
    ctx.textAlign = "center";
    ctx.fillText(headerText, 445, 40);

    // Reset the shadow settings
    ctx.shadowBlur = shadowBlur;
    ctx.shadowColor = shadowColor;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
}

function drawYears(ctx) {
    const headerText = "Years";
    const headerFontSize = 42;
    const headerFontColor = "white";
    const headerFont = `bold ${headerFontSize}px ${font}`;

    // Save the current shadow settings
    const { shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY } = ctx;

    // Set the shadow effect for the header text
    ctx.shadowBlur = 5;
    ctx.shadowColor = "black";
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.font = headerFont;
    ctx.fillStyle = headerFontColor;
    ctx.textAlign = "center";
    ctx.fillText(headerText, 1335, 40);

    // Reset the shadow settings
    ctx.shadowBlur = shadowBlur;
    ctx.shadowColor = shadowColor;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
}

function drawDivider(ctx, height) {
    const { shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY } = ctx;

    // Set the shadow effect for the line
    ctx.shadowBlur = 3;
    ctx.shadowColor = "black";
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Draw the line
    ctx.beginPath();
    ctx.moveTo(890, 20);
    ctx.lineTo(890, height);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "white";
    ctx.stroke();

    // Reset the shadow settings
    ctx.shadowBlur = shadowBlur;
    ctx.shadowColor = shadowColor;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
}

function drawPackSquares(ctx, data, approved_data) {
    const boxWidth = 28;
    const boxHeight = boxWidth;
    const gap = 4;
    const rows = Math.ceil(data.length / 25);
    const cols = 25;
    const startX = (890 - cols * (boxWidth + gap) + gap) / 2;
    const startY = 70;
    const size = 32;

    const { shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY } = ctx;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = startX + col * (boxWidth + gap);
            const y = startY + row * (boxHeight + gap);
            const packNumber = row * cols + col;
            const packData = data[packNumber];
            const scorePercent = packData?.beatmap_count
                ? packData.scores_count / packData.beatmap_count
                : 0;
            if (!packData) continue;

            // Draw the square
            ctx.fillStyle = `hsl(${scorePercent * 115}, 80%, 50%)`;
            defineRoundedRect(ctx, x, y, boxWidth, boxHeight, 5);
            ctx.fill();

            // create a gradient for the reflection
            const gradient = ctx.createLinearGradient(x, y, x, y + size);

            gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
            gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

            // fill the square with the gradient
            ctx.fillStyle = gradient;
            ctx.fill();

            // Draw the pack number on top of the square
            ctx.shadowBlur = 3;
            ctx.shadowColor = "black";
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;

            ctx.fillStyle = "white";
            ctx.font = `${packData.pack_id > 999 ? "12px" : "16px"} ${font}`;
            ctx.textAlign = "center";
            ctx.fillText(
                packData.pack_id,
                x + boxWidth / 2 - 1,
                y + boxHeight / 2 + 4
            );

            ctx.shadowBlur = shadowBlur;
            ctx.shadowColor = shadowColor;
            ctx.shadowOffsetX = shadowOffsetX;
            ctx.shadowOffsetY = shadowOffsetY;
        }
    }

    // Draw the final row with approved packs
    const finalRowY = startY + rows * (boxHeight + gap);

    for (let col = 0; col < cols; col++) {
        const x = startX + col * (boxWidth + gap);
        const approvedPack = approved_data[col];
        const scorePercent = approvedPack?.beatmap_count
            ? approvedPack.scores_count / approvedPack.beatmap_count
            : 0;
        if (!approvedPack) continue;

        // Draw the square
        ctx.fillStyle = `hsl(${scorePercent * 115}, 80%, 50%)`;
        defineRoundedRect(ctx, x, finalRowY, boxWidth, boxHeight, 5);
        ctx.fill();

        // create a gradient for the reflection
        const gradient = ctx.createLinearGradient(
            x,
            finalRowY,
            x,
            finalRowY + size
        );

        gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        // fill the square with the gradient
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw the pack number on top of the square
        ctx.shadowBlur = 3;
        ctx.shadowColor = "black";
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillStyle = "white";
        ctx.font = `15px ${font}`;
        ctx.textAlign = "center";
        ctx.fillText(
            "A" + approvedPack.pack_id,
            x + boxWidth / 2,
            finalRowY + boxHeight / 2 + 5
        );

        ctx.shadowBlur = shadowBlur;
        ctx.shadowColor = shadowColor;
        ctx.shadowOffsetX = shadowOffsetX;
        ctx.shadowOffsetY = shadowOffsetY;
    }
}

function drawYearsProgressbars(ctx, yearsData, totalHeight) {
    const startX = 994;
    const startY = 70;
    const barWidth = 738;
    const barCount = yearsData.length;
    const barHeight = 32;
    const totalBarsHeight = barCount * barHeight;
    const remainingHeight = totalHeight - totalBarsHeight;
    const barMargin = remainingHeight / (barCount - 1);

    for (let i = 0; i < barCount; i++) {
        const yearData = yearsData[i];
        const { year, scoresCount, beatmapCount } = yearData;
        const completionPercentage = (scoresCount / beatmapCount) * 100;

        const barX = startX;
        const barY = startY + (barHeight + barMargin) * i;
        const filledWidth = (barWidth * completionPercentage) / 100;

        // Draw the progress bar background with rounded corners
        defineRoundedRect(ctx, barX, barY, barWidth, barHeight, 5);
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fill();

        // Draw the filled progress bar
        ctx.fillStyle = `hsl(${completionPercentage}, 80%, 50%)`;
        defineRoundedRect(ctx, barX, barY, filledWidth, barHeight, 5);
        ctx.fill();

        // Define the gradient for the filled progress bar
        const gradient = ctx.createLinearGradient(
            barX,
            barY,
            barX,
            barY + barHeight
        );
        gradient.addColorStop(0, "hsla(0, 0%, 100%, 0.3)");
        gradient.addColorStop(0.5, "hsla(0, 0%, 100%, 0)");
        gradient.addColorStop(1, "hsla(0, 0%, 100%, 0.3)");

        // Draw the reflection gradient
        ctx.fillStyle = gradient;
        defineRoundedRect(ctx, barX, barY, filledWidth, barHeight, 5);
        ctx.fill();

        // Set up the shadow effect for the text
        ctx.shadowColor = "black";
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 3;

        // Draw the year text
        ctx.font = `bold 22px ${font}`;
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";
        ctx.fillText(year, barX - 35, barY + barHeight / 2);

        // Draw the text with shadow in the middle of the progress bar
        const text = `${completionPercentage.toFixed(2)}% ~ ${formatNumber(
            scoresCount
        )} / ${formatNumber(beatmapCount)}`;
        const textX = barX + barWidth / 2;
        const textY = barY + barHeight / 2;

        ctx.font = `bold 22px ${font}`;
        ctx.textAlign = "center";
        ctx.fillText(text, textX, textY);

        // Reset the shadow settings
        ctx.shadowColor = "transparent";
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
    }
}

function drawCompletionHeader(ctx, date, height) {
    const text = `Completion up to ${date}`;
    //const barY = 200 + (32 + 51) * 4; // Y-coordinate of the 5th progress bar
    const barY = height;

    // Set the shadow effect for the header text
    ctx.shadowBlur = 5;
    ctx.shadowColor = "black";
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.font = `bold 28px ${font}`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(text, 890, barY + 60);

    // Reset the shadow settings
    ctx.shadowColor = "transparent";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
}

function drawCompletionProgressbar(ctx, completionData, height) {
    const startX = 48;
    const startY = height + 30;
    const barWidth = 1684;
    const barHeight = 32;

    const completionPercentage =
        (completionData.scoresCount / completionData.beatmapCount) * 100;
    const filledWidth = (barWidth * completionPercentage) / 100;

    // Draw the progress bar background with rounded corners
    defineRoundedRect(ctx, startX, startY, barWidth, barHeight, 5);
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fill();

    // Draw the filled progress bar
    ctx.fillStyle = `hsl(${completionPercentage}, 80%, 50%)`;
    defineRoundedRect(ctx, startX, startY, filledWidth, barHeight, 5);
    ctx.fill();

    // Define the gradient for the filled progress bar
    const gradient = ctx.createLinearGradient(
        startX,
        startY,
        startX,
        startY + barHeight
    );
    gradient.addColorStop(0, "hsla(0, 0%, 100%, 0.3)");
    gradient.addColorStop(0.5, "hsla(0, 0%, 100%, 0)");
    gradient.addColorStop(1, "hsla(0, 0%, 100%, 0.3)");

    // Draw the reflection gradient
    ctx.fillStyle = gradient;
    defineRoundedRect(ctx, startX, startY, filledWidth, barHeight, 5);
    ctx.fill();

    // Set up the shadow effect for the text
    ctx.shadowColor = "black";
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 3;

    // Draw the text with shadow in the middle of the progress bar
    const text = `${completionPercentage.toFixed(2)}% ~ ${formatNumber(
        completionData.scoresCount
    )} / ${formatNumber(completionData.beatmapCount)}`;
    const textX = startX + barWidth / 2;
    const textY = startY + barHeight / 2;

    ctx.font = `bold 22px ${font}`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, textX, textY);

    // Reset the shadow settings
    ctx.shadowColor = "transparent";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
}

async function createImage(user) {
    const data = await fetchData(user);

    const canvasHeight = (data.beatmap_packs.length / 25) * (28 + 4) + 220;
    const yearsBarsHeight =
        Math.ceil(
            (data.beatmap_packs.length + data.approved_packs.length) / 25
        ) *
            (28 + 4) +
        4;
    // Create canvas
    const canvas = createCanvas(1780, canvasHeight);
    const ctx = canvas.getContext("2d");

    // Set background color to transparent
    ctx.fillStyle = "rgba(0,0,0,0)";
    //ctx.fillStyle = 'rgba(56, 46, 50, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawPackCompletion(ctx);
    drawYears(ctx);
    drawPackSquares(ctx, data.beatmap_packs, data.approved_packs);
    drawYearsProgressbars(ctx, data.years, yearsBarsHeight);
    drawCompletionHeader(ctx, user.date, yearsBarsHeight + 40);
    drawCompletionProgressbar(ctx, data.completion, yearsBarsHeight + 40 + 60);
    drawDivider(ctx, yearsBarsHeight + 40 + 40);

    // Save PNG file
    const fileName = `${user.user_id}_completion.png`;
    const completeFilePath = path.join(filePath, fileName);
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(completeFilePath, buffer);
    console.log(`The PNG file for ${user.user_id} was created.`);
    return;
}

async function main() {
    await db.connect();
    for (const user of users) {
        await createImage(user);
    }
    await db.disconnect();
}

main();
