// SpoolmanDB unified JSON URL
const JSON_URL = 'https://donkie.github.io/SpoolmanDB/filaments.json';
const STORAGE_KEY = 'my_owned_filaments';

// Mixing curve adjustment data
// Maps visual gradient positions (0%–100%) to the actual filament A mix ratio
const MIXING_CURVES = {
    // Visual position: [0%, 10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90%, 100%]
    Neutral:  [0.0,  0.10,  0.20,  0.30,  0.40,  0.50,  0.60,  0.70,  0.80,  0.90,  1.0],
    Vivid:    [0.0,  0.04,  0.10,  0.22,  0.35,  0.50,  0.65,  0.78,  0.90,  0.95,  1.0],
    Contrast: [0.0,  0.01,  0.02,  0.04,  0.08,  0.15,  0.24,  0.38,  0.55,  0.77,  1.0],
    Deep:     [0.0,  0.01,  0.02,  0.04,  0.08,  0.15,  0.22,  0.31,  0.41,  0.53,  1.0]
};

// Download URLs mapped to each model
const DOWNLOAD_URLS = {
    'M1': 'https://makerworld.com/en/models/2742633-flexchroma-blend-filament-m1',
    'M2': 'https://makerworld.com/en/models/2638560-flexchroma-blend-filament-m2',
    'M3': 'https://makerworld.com/en/models/2703841-flexchroma-blend-filament-m4',
    'M4': 'https://makerworld.com/en/models/2644430-flexchroma-blend-filament-m4',
    'S1': 'https://makerworld.com/en/models/2740486-flexchroma-blend-filament-s1',
    'S2': 'https://makerworld.com/en/models/2607360-flexchroma-blend-filament-s2',
    'S3': 'https://makerworld.com/en/models/2671404-flexchroma-blend-filament-s3',
    'S4': 'https://makerworld.com/en/models/2575708-flexchroma-blend-filament'
};

let filamentDatabase = [];

const selectMaker = document.getElementById('detail-maker');
const selectType = document.getElementById('detail-type');
const selectColorName = document.getElementById('detail-color-name');
const inputColor = document.getElementById('detail-color');
const btnAddDetailed = document.getElementById('btn-add-detailed');
const btnAddQuick = document.getElementById('btn-add-quick');
const inputQuickName = document.getElementById('new-filament-name');
const inputQuickColor = document.getElementById('new-filament-color');
const filamentList = document.getElementById('filament-list');
const selectColorA = document.getElementById('select-color-a');
const selectColorB = document.getElementById('select-color-b');
const ratioListBody = document.getElementById('ratio-list-body');
const filamentAColorDot = document.querySelector('.filament-a-color-dot');
const filamentBColorDot = document.querySelector('.filament-b-color-dot');
const selectCurve = document.getElementById('select-curve');
const mixerInfo = document.querySelector('.mixer-info');
const selectModel = document.getElementById('select-model');
const btnGenerate = document.getElementById('btn-generate');

async function init() {
    loadFilamentsFromStorage();

    try {
        setSelectPlaceholder(selectMaker, 'Loading data...');
        const response = await fetch(JSON_URL);
        if (!response.ok) throw new Error('Network error while fetching filament data.');
        filamentDatabase = (await response.json()).filter(
            f => f.diameter === 1.75);
        populateMakers();
    } catch (error) {
        console.error('Failed to fetch filament data:', error);
        setSelectPlaceholder(selectMaker, 'Failed to load data');
    }
}

function setSelectPlaceholder(selectElement, text) {
    selectElement.innerHTML = `<option value="">-- ${text} --</option>`;
}

function populateMakers() {
    const makers = [...new Set(filamentDatabase.map(f => f.manufacturer))].sort();
    selectMaker.innerHTML = '<option value="">Select a manufacturer</option>';
    makers.forEach(maker => {
        if (maker) {
            const option = document.createElement('option');
            option.value = maker;
            option.textContent = maker;
            selectMaker.appendChild(option);
        }
    });
    setSelectPlaceholder(selectType, 'Select a manufacturer first');
    setSelectPlaceholder(selectColorName, 'Select a type first');
}

function populateTypes() {
    const selectedMaker = selectMaker.value;
    if (!selectedMaker) {
        setSelectPlaceholder(selectType, 'Select a manufacturer first');
        setSelectPlaceholder(selectColorName, 'Select a type first');
        return;
    }
    const filtered = filamentDatabase.filter(f => f.manufacturer === selectedMaker);
    const types = [...new Set(filtered.map(f => f.material))].sort();

    selectType.innerHTML = '<option value="">Select a type</option>';
    types.forEach(type => {
        if (type) {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            selectType.appendChild(option);
        }
    });
    setSelectPlaceholder(selectColorName, 'Select a type first');
}

function populateColorNames() {
    const selectedMaker = selectMaker.value;
    const selectedType = selectType.value;
    if (!selectedMaker || !selectedType) {
        setSelectPlaceholder(selectColorName, 'Select a type first');
        return;
    }
    const filtered = filamentDatabase.filter(f => 
        f.manufacturer === selectedMaker && f.material === selectedType
    );

    selectColorName.innerHTML = '<option value="">Select a color</option>';
    filtered.forEach(item => {
        if (item.name) {
            const option = document.createElement('option');
            option.value = item.color_hex ? `#${item.color_hex}` : '#ffffff';
            option.textContent = item.name;
            selectColorName.appendChild(option);
        }
    });
}

function syncColorPicker() {
    const selectedColorHex = selectColorName.value;
    if (selectedColorHex && selectedColorHex.startsWith('#')) {
        inputColor.value = selectedColorHex.toLowerCase();
    }
}

function appendFilamentDOM(name, colorHex) {
    const li = document.createElement('li');
    li.className = 'filament-item';
    li.dataset.name = name;
    li.dataset.color = colorHex;

    li.innerHTML = `
        <div class="filament-info">
            <span class="color-dot" style="background-color: ${colorHex};"></span>
            <span class="filament-name">${name}</span>
        </div>
        <button class="btn-delete" title="Delete">&times;</button>
    `;

    li.querySelector('.btn-delete').addEventListener('click', () => {
        li.remove();
        saveFilamentsToStorage();
        updateMixerSelectors();
    });

    filamentList.appendChild(li);
}

function addFilamentFromDetails() {
    const maker = selectMaker.value;
    const type = selectType.value;
    const colorName = selectColorName.options[selectColorName.selectedIndex]?.text;
    const colorHex = inputColor.value;

    if (!maker || !type || !selectColorName.value) {
        alert('Please select all fields.');
        return;
    }

    const fullName = `${maker} ${type} ${colorName}`;
    appendFilamentDOM(fullName, colorHex);
    
    saveFilamentsToStorage();
    updateMixerSelectors();
    selectColorName.selectedIndex = 0;
}

if (btnAddQuick) {
    btnAddQuick.addEventListener('click', () => {
        const name = inputQuickName.value.trim();
        const color = inputQuickColor.value;
        if (!name) {
            alert('Please enter a filament name.');
            return;
        }
        appendFilamentDOM(name, color);
        saveFilamentsToStorage();
        updateMixerSelectors();
        inputQuickName.value = '';
    });
}

function saveFilamentsToStorage() {
    const items = filamentList.querySelectorAll('.filament-item');
    const filamentData = [];

    items.forEach(item => {
        filamentData.push({
            name: item.dataset.name,
            color: item.dataset.color
        });
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filamentData));
}

function loadFilamentsFromStorage() {
    filamentList.innerHTML = '';
    
    const storedData = localStorage.getItem(STORAGE_KEY);

    if (storedData) {
        try {
            const filamentData = JSON.parse(storedData);

            if (Array.isArray(filamentData)) {
                filamentData.forEach(item => {
                    appendFilamentDOM(item.name, item.color);
                });
            }
        } catch (e) {
            console.error('Failed to parse stored filament data:', e);
        }
    }

    updateMixerSelectors();
}

function updateMixerSelectors() {
    const items = filamentList.querySelectorAll('.filament-item');
    let optionsHtml = '';

    items.forEach(item => {
        const name = item.dataset.name;
        const color = item.dataset.color;
        optionsHtml += `<option value="${color}">${name}</option>`;
    });

    if (items.length === 0) {
        optionsHtml = '<option value="">Please add a filament</option>';
    }

    const currentA = selectColorA.value;
    const currentB = selectColorB.value;

    selectColorA.innerHTML = optionsHtml;
    selectColorB.innerHTML = optionsHtml;

    if (currentA) selectColorA.value = currentA;
    if (currentB) selectColorB.value = currentB;

    calculateColorMixing();
}

// ==========================================
// 🎨 Real-time color mixing simulation logic
// ==========================================

function calculateHueDifference(colorA, colorB) {
    const h1 = colorA.get('hsl.h');
    const h2 = colorB.get('hsl.h');
    if (isNaN(h1) || isNaN(h2)) return 0;

    let hueDiff = Math.abs(h1 - h2);
    if (hueDiff > 180) hueDiff = 360 - hueDiff;
    return hueDiff;
}

function chooseCurve(currentCurve, hueDiff, lightnessDiff) {
    let curve = currentCurve;
    if (currentCurve === 'Auto') {
        if (hueDiff < 20 && lightnessDiff < 10) {
            curve = 'Natural';
        } else if (lightnessDiff >= 40) {
            curve = 'Contrast';
        } else {
            curve = 'Vivid';
        }
    }
    return curve;
}

function addQuickFilament(colorHex, ratioText) {
    const filamentNameA = selectColorA.options[selectColorA.selectedIndex]?.text || 'Unknown A';
    const filamentNameB = selectColorB.options[selectColorB.selectedIndex]?.text || 'Unknown B';
    const name = `${filamentNameA} / ${filamentNameB} - ${ratioText}`;
    
    inputQuickName.value = name;
    inputQuickColor.value = colorHex;
}

function createMixingBarsHtml(colorA, colorB, curveData) {
    let html = '';

    for (let i = 10; i >= 0; i--) {
        const visualProgressA = i * 10;
        const visualProgressB = 100 - visualProgressA;
        const actualRatioA = curveData[i];
        const actualPercentA = Math.round(actualRatioA * 100);
        const actualPercentB = 100 - actualPercentA;
        const blended = colorA.mix(colorB, actualPercentB / 100.0, 'rgb');

        html += `
            <tr>
                <td class="ratio-text">
                    <strong>Position: ${visualProgressA}%</strong> : ${visualProgressB}%
                    <span style="display:block; font-size:0.75rem; color:#64748b; margin-top:2px;">
                    </span>
                </td>
                <td class="rgb-text" style="vertical-align: middle;"><code>${blended.css()} / ${blended.hex()}</code></td>
                <td style="vertical-align: middle;"><div class="color-preview" style="background-color: ${blended.hex()};"></div></td>
                <td style="vertical-align: middle;"><button onclick="addQuickFilament('${blended.hex()}', '${actualPercentA}%')">➕</button></td>
            </tr>
        `;
    }
    return html;
}

function createMixingBarsHtmlKM(inColorA, inColorB) {
    const colorA = new spectral.Color(inColorA.hex());
    const colorB = new spectral.Color(inColorB.hex());
    const pallet = spectral.palette(colorA, colorB, 10);
    pallet.push(colorB);

    let html = '';

    pallet.forEach((color, index) => {
        const visualProgressA = index * 10;
        const visualProgressB = 100 - visualProgressA;
        const rgb = color.sRGB;
        html += `
            <tr>
                <td class="ratio-text">
                    <strong>Position: ${visualProgressA}%</strong> : ${visualProgressB}%
                    <span style="display:block; font-size:0.75rem; color:#64748b; margin-top:2px;">
                    </span>
                </td>
                <td class="rgb-text" style="vertical-align: middle;"><code>rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]}) / ${color.toString()}</code></td>
                <td style="vertical-align: middle;"><div class="color-preview" style="background-color: ${color.toString()};"></div></td>
                <td style="vertical-align: middle;"><button onclick="addQuickFilament('${color.toString()}', '${visualProgressA}%')">➕</button></td>
            </tr>
        `;
    });

    return html;
}

function calculateColorMixing() {
    const valA = selectColorA.value;
    const valB = selectColorB.value;
    const currentCurve = selectCurve ? selectCurve.value : 'Auto';

    if (!valA || !valB || valA.includes('Please add a filament') || valB.includes('Please add a filament')) {
        ratioListBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#94a3b8;">Please add filaments from the left column and select them.</td></tr>`;
        return;
    }

    const colorA = chroma(valA);
    const colorB = chroma(valB);
    const hueDiff = calculateHueDifference(colorA, colorB);
    const lightnessDiff = Math.abs(colorA.get('lab.l') - colorB.get('lab.l'));
    const curve = chooseCurve(currentCurve, hueDiff, lightnessDiff);
    const curveData = MIXING_CURVES[curve] || MIXING_CURVES['Neutral'];

    mixerInfo.innerHTML = `
        <p style="margin: 0; font-size: 0.9rem; color: #4a5568;">
            Hue diff: ${hueDiff.toFixed(1)}° | Lightness diff: ${lightnessDiff.toFixed(1)} ${currentCurve === 'Auto' ? '| Selected curve: ' + curve : ''}
        </p>
    `;
    filamentAColorDot.style.backgroundColor = colorA.hex();
    filamentBColorDot.style.backgroundColor = colorB.hex();
    if (currentCurve === 'KM') {
        ratioListBody.innerHTML = createMixingBarsHtmlKM(colorA, colorB);
    } else {
        ratioListBody.innerHTML = createMixingBarsHtml(colorA, colorB, curveData);
    }
}

// ==========================================
// 📥 Model download navigation logic
// ==========================================

function handleDownload() {
    if (!selectModel) return;

    const selectedModel = selectModel.value;
    if (!selectedModel) {
        alert('Please select a filament model (M1–M4 or S1–S4).');
        return;
    }

    const targetUrl = DOWNLOAD_URLS[selectedModel];
    if (targetUrl) {
        window.open(targetUrl, '_blank');
    } else {
        alert('No download URL found for the selected model.');
    }
}

selectMaker.addEventListener('change', populateTypes);
selectType.addEventListener('change', populateColorNames);
selectColorName.addEventListener('change', syncColorPicker);
btnAddDetailed.addEventListener('click', addFilamentFromDetails);
selectColorA.addEventListener('change', calculateColorMixing);
selectColorB.addEventListener('change', calculateColorMixing);
selectCurve.addEventListener('change', calculateColorMixing);
btnGenerate.addEventListener('click', handleDownload);

init();
calculateColorMixing();
