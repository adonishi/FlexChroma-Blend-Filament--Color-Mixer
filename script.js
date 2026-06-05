// SpoolmanDBの統合JSONのURL
const JSON_URL = 'https://donkie.github.io/SpoolmanDB/filaments.json';
const STORAGE_KEY = 'my_owned_filaments';

// 📈 混色カーブ補正データ
// 視覚的なグラデーション位置 (0%〜100%) に対応する、実際のフィラメントAの混色比率(%)
const MIXING_CURVES = {
    // Visual位置: [ 0%,  10%,  20%,  30%,  40%,  50%,  60%,  70%,  80%,  90%, 100%]
    Neutral:  [0.0,  0.10,  0.20,  0.30,  0.40,  0.50,  0.60,  0.70,  0.80,  0.90,  1.0],
    Vivid:    [0.0,  0.04,  0.11,  0.24,  0.38,  0.53,  0.69,  0.81,  0.90,  0.95,  1.0],
    Contrast: [0.0,  0.01,  0.02,  0.04,  0.08,  0.15,  0.24,  0.36,  0.53,  0.75,  1.0],
    Deep:     [0.0,  0.01,  0.02,  0.04,  0.08,  0.15,  0.24,  0.36,  0.53,  0.75,  1.0]
};

// 各モデルに対応するダウンロードサイトのURLマップ（実際のURLに書き換えてください）
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

// グローバルにデータを保持する変数
let filamentDatabase = [];

// DOM要素の取得
const selectMaker = document.getElementById('detail-maker');
const selectType = document.getElementById('detail-type');
const selectColorName = document.getElementById('detail-color-name');
const inputColor = document.getElementById('detail-color');
const btnAddDetailed = document.getElementById('btn-add-detailed');
const btnAddQuick = document.getElementById('btn-add-quick'); // 追加ボタン
const inputQuickName = document.getElementById('new-filament-name'); // 追加・名前
const inputQuickColor = document.getElementById('new-filament-color'); // 追加・カラー
const filamentList = document.getElementById('filament-list');
const selectColorA = document.getElementById('select-color-a'); // シミュレーター側のセレクトボックス
const selectColorB = document.getElementById('select-color-b');
const ratioListBody = document.getElementById('ratio-list-body');
const filamentAColorDot = document.querySelector('.filament-a-color-dot');
const filamentBColorDot = document.querySelector('.filament-b-color-dot');
const selectCurve = document.getElementById('select-curve'); // カーブ選択要素
const mixerInfo = document.querySelector('.mixer-info');
const selectModel = document.getElementById('select-model');
const btnGenerate = document.getElementById('btn-generate');


// 1. 初期化処理
async function init() {
    // まずLocalStorageからデータを読み込んでリストを表示
    loadFilamentsFromStorage();

    try {
        setSelectPlaceholder(selectMaker, 'データ読み込み中...');
        const response = await fetch(JSON_URL);
        if (!response.ok) throw new Error('ネットワークエラーが発生しました。');
        filamentDatabase = (await response.json()).filter(
            f => f.diameter === 1.75); // 1.75mmのフィラメントに絞る
        populateMakers();
    } catch (error) {
        console.error('データの取得に失敗しました:', error);
        setSelectPlaceholder(selectMaker, 'データの読み込みに失敗しました');
    }
}

// 共通：セレクトボックスを初期化するヘルパー
function setSelectPlaceholder(selectElement, text) {
    selectElement.innerHTML = `<option value="">-- ${text} --</option>`;
}

// 2. メーカープルダウンの生成
function populateMakers() {
    const makers = [...new Set(filamentDatabase.map(f => f.manufacturer))].sort();
    selectMaker.innerHTML = '<option value="">選択してください</option>';
    makers.forEach(maker => {
        if(maker) {
            const option = document.createElement('option');
            option.value = maker;
            option.textContent = maker;
            selectMaker.appendChild(option);
        }
    });
    setSelectPlaceholder(selectType, 'メーカーを先に選択');
    setSelectPlaceholder(selectColorName, '種類を先に選択');
}

// 3. 種類（マテリアル）プルダウンの生成
function populateTypes() {
    const selectedMaker = selectMaker.value;
    if (!selectedMaker) {
        setSelectPlaceholder(selectType, 'メーカーを先に選択');
        setSelectPlaceholder(selectColorName, '種類を先に選択');
        return;
    }
    const filtered = filamentDatabase.filter(f => f.manufacturer === selectedMaker);
    const types = [...new Set(filtered.map(f => f.material))].sort();

    selectType.innerHTML = '<option value="">選択してください</option>';
    types.forEach(type => {
        if(type) {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            selectType.appendChild(option);
        }
    });
    setSelectPlaceholder(selectColorName, '種類を先に選択');
}

// 4. 色名プルダウンの生成
function populateColorNames() {
    const selectedMaker = selectMaker.value;
    const selectedType = selectType.value;
    if (!selectedMaker || !selectedType) {
        setSelectPlaceholder(selectColorName, '種類を先に選択');
        return;
    }
    const filtered = filamentDatabase.filter(f => 
        f.manufacturer === selectedMaker && f.material === selectedType
    );

    selectColorName.innerHTML = '<option value="">選択してください</option>';
    filtered.forEach(item => {
        if(item.name) {
            const option = document.createElement('option');
            option.value = item.color_hex ? `#${item.color_hex}` : '#ffffff';
            option.textContent = item.name;
            selectColorName.appendChild(option);
        }
    });
}

// 5. カラーピッカーの自動同期
function syncColorPicker() {
    const selectedColorHex = selectColorName.value;
    if (selectedColorHex && selectedColorHex.startsWith('#')) {
        inputColor.value = selectedColorHex.toLowerCase();
    }
}

// 6. 画面にフィラメント要素を追加する共通関数
function appendFilamentDOM(name, colorHex) {
    const li = document.createElement('li');
    li.className = 'filament-item';
    // データ属性として保持（Storage保存用）
    li.dataset.name = name;
    li.dataset.color = colorHex;

    li.innerHTML = `
        <div class="filament-info">
            <span class="color-dot" style="background-color: ${colorHex};"></span>
            <span class="filament-name">${name}</span>
        </div>
        <button class="btn-delete" title="削除">&times;</button>
    `;

    // 削除ボタンの処理
    li.querySelector('.btn-delete').addEventListener('click', () => {
        li.remove();          // 画面から削除
        saveFilamentsToStorage(); // LocalStorageを最新状態に更新
        updateMixerSelectors();  // 中央のセレクトボックスを更新
    });

    filamentList.appendChild(li);
}

// 7. 「DBから追加」ボタン処理
function addFilamentFromDetails() {
    const maker = selectMaker.value;
    const type = selectType.value;
    const colorName = selectColorName.options[selectColorName.selectedIndex]?.text;
    const colorHex = inputColor.value;

    if (!maker || !type || !selectColorName.value) {
        alert('すべての項目を選択してください。');
        return;
    }

    const fullName = `${maker} ${type} ${colorName}`;
    appendFilamentDOM(fullName, colorHex);
    
    saveFilamentsToStorage(); // 保存
    updateMixerSelectors();   // 同期
    selectColorName.selectedIndex = 0; // リセット
}

// 8. 追加ボタンの処理
if (btnAddQuick) {
    btnAddQuick.addEventListener('click', () => {
        const name = inputQuickName.value.trim();
        const color = inputQuickColor.value;
        if (!name) {
            alert('フィラメント名を入力してください。');
            return;
        }
        appendFilamentDOM(name, color);
        saveFilamentsToStorage();
        updateMixerSelectors();
        inputQuickName.value = '';
    });
}

// 9. 💾 LocalStorageへの保存処理
function saveFilamentsToStorage() {
    const items = filamentList.querySelectorAll('.filament-item');
    const filamentData = [];

    items.forEach(item => {
        filamentData.push({
            name: item.dataset.name,
            color: item.dataset.color
        });
    });

    // 配列をJSON文字列に変換してLocalStorageに保存
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filamentData));
}

// 10. 💾 LocalStorageからの読み込み処理
function loadFilamentsFromStorage() {
    filamentList.innerHTML = ''; // 既存の静的モックデータをクリア
    
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
            console.error('LocalStorageのデータ解析に失敗しました:', e);
        }
    }

    // 中央セレクトボックスの初期同期
    updateMixerSelectors();
}

// 11. 中央シミュレーターの同期
function updateMixerSelectors() {
    const items = filamentList.querySelectorAll('.filament-item');
    let optionsHtml = '';

    items.forEach(item => {
        const name = item.dataset.name;
        const color = item.dataset.color;
        optionsHtml += `<option value="${color}">${name}</option>`;
    });

    if (items.length === 0) {
        optionsHtml = '<option value="">フィラメントを追加してください</option>';
    }

    const currentA = selectColorA.value;
    const currentB = selectColorB.value;

    selectColorA.innerHTML = optionsHtml;
    selectColorB.innerHTML = optionsHtml;

    if(currentA) selectColorA.value = currentA;
    if(currentB) selectColorB.value = currentB;

    calculateColorMixing();         
}

// ==========================================
// 🎨 リアルタイム混色シミュレーションロジック
// ==========================================

// 色相差
function calculateHueDifference(colorA, colorB) {
    const h1 = colorA.get('hsl.h');
    const h2 = colorB.get('hsl.h');
    if (isNaN(h1) || isNaN(h2)) return 0; // 色相が定義されない場合は差を0とする

    let hueDiff = Math.abs(h1 - h2);
    if (hueDiff > 180) hueDiff = 360 - hueDiff;
    return hueDiff;
}

// 'Auto'カーブ選択ロジック
function calcCurve(currentCurve, hueDiff, lightnessDiff) {
    let curve = currentCurve;
    if (currentCurve === 'Auto') {
        // 自動選択ロジック：色相差と明度差に基づいて最適なカーブを選ぶ
        if (hueDiff < 20 && lightnessDiff < 10) {
            // 色相も明度も近い → 鮮やかさ重視のVivid
            curve = 'Vivid';
        } else if (hueDiff >= 20 && hueDiff < 90) {
            // 色相差が中程度 → コントラスト強調のContrast
            curve = 'Contrast';
        } else if (hueDiff >= 90) {
            // 色相差が大きい → 深み重視のDeep
            curve = 'Deep';
        } else {
            // デフォルトはNeutral
            curve = 'Neutral';
        }
    }
    return curve;
}

// 混色比率リスト（10%刻み・11行）のHTMLを生成する関数
function createMixingBarsHtml(colorA, colorB, curveData) {
    let html = '';

    // 視覚的なグラデーション位置 100% から 0% まで 10% 刻みでループ処理 (計11段階)
    // 配列のインデックス（10 から 0）に対応
    for (let i = 10; i >= 0; i--) {
        const visualProgressA = i * 10;           // 画面に表示する「見た目のグラデーション位置A %」
        const visualProgressB = 100 - visualProgressA; // 「見た目のグラデーション位置B %」
        
        // 📊 CSVデータに基づいて、見た目の位置に対応する「実際の物理的な混色比率」をルックアップ
        const actualRatioA = curveData[i]; 
        const actualPercentA = Math.round(actualRatioA * 100);
        const actualPercentB = 100 - actualPercentA;

        // 実際のフィラメント混色比率を元にRGBをブレンド
        const blended = colorA.mix(colorB, actualPercentB/100.0, 'rgb');

        // 各行のHTMLテンプレート（比率の表示を「見た目」と「実際の送り出し比率」がわかるようにリッチ化）
        html += `
            <tr>
                <td class="ratio-text">
                    <strong>位置: ${visualProgressA}%</strong> : ${visualProgressB}%
                    <span style="display:block; font-size:0.75rem; color:#64748b; margin-top:2px;">
                    </span>
                </td>
                <td class="rgb-text" style="vertical-align: middle;"><code>${blended.css()} / ${blended.hex()}</code></td>
                <td style="vertical-align: middle;"><div class="color-preview" style="background-color: ${blended.hex()};"></div></td>
            </tr>
        `;
    }
    return html;
}

/**
 * 中央の混色テーブルを再計算して描画するメイン関数
 */
function calculateColorMixing() {
    const valA = selectColorA.value;
    const valB = selectColorB.value;
    const currentCurve = selectCurve ? selectCurve.value : 'Auto'; // 選択されたカーブ名

    // どちらかのフィラメントが選択されていない場合は待機案内を表示
    if (!valA || !valB || valA.includes('追加してください') || valB.includes('追加してください')) {
        ratioListBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#94a3b8;">左列からフィラメントを追加して選択してください</td></tr>`;
        return;
    }

    const colorA = chroma(valA);
    const colorB = chroma(valB);

    // 色相差 & 明度差
    const hueDiff = calculateHueDifference(colorA, colorB);
    const lightnessDiff = Math.abs(colorA.get('lab.l') - colorB.get('lab.l'));

    // 選択されたカーブの配列データを取得
    const curve = calcCurve(currentCurve, hueDiff, lightnessDiff);
    const curveData = MIXING_CURVES[curve] || MIXING_CURVES['Neutral'];

    mixerInfo.innerHTML = `
        <p style="margin: 0; font-size: 0.9rem; color: #4a5568;">
            色相差: ${hueDiff.toFixed(1)}° | 明度差: ${lightnessDiff.toFixed(1)} ${currentCurve === 'Auto' ? '| 選択カーブ: ' + curve : ''}
        </p>
    `;
    filamentAColorDot.style.backgroundColor = colorA.hex();
    filamentBColorDot.style.backgroundColor = colorB.hex();

    // テーブルのボディ部分を書き換え
    ratioListBody.innerHTML = createMixingBarsHtml(colorA, colorB, curveData);;
}

// ==========================================
// 📥 モデル別ダウンロードサイト遷移ロジック
// ==========================================

/**
 * 選択されたモデルに応じたURLを別タブで開く関数
 */
function handleDownload() {
    if (!selectModel) return;

    const selectedModel = selectModel.value;

    // モデルが選択されていない場合はアラートを出す
    if (!selectedModel) {
        alert('出力設定でフィラメントモデル（M1〜M4, S1〜S4）を選択してください。');
        return;
    }

    // 対応するURLを取得
    const targetUrl = DOWNLOAD_URLS[selectedModel];

    if (targetUrl) {
        // 🌐 window.open の第二引数に '_blank' を指定して別タブで開く
        window.open(targetUrl, '_blank');
    } else {
        alert('該当モデルのダウンロードURLが見つかりませんでした。');
    }
}

// ==========================================
// 🔄 既存の関数への割り込み・統合処理
// ==========================================

// イベントリスナーの登録
selectMaker.addEventListener('change', populateTypes);
selectType.addEventListener('change', populateColorNames);
selectColorName.addEventListener('change', syncColorPicker);
btnAddDetailed.addEventListener('click', addFilamentFromDetails);
selectColorA.addEventListener('change', calculateColorMixing); // A、B、および新設した「混色カーブ」の選択が切り替えられたら再計算するイベントを登録
selectColorB.addEventListener('change', calculateColorMixing);
selectCurve.addEventListener('change', calculateColorMixing);
btnGenerate.addEventListener('click', handleDownload); // 右列のダウンロード（旧生成）ボタンにイベントを登録

// 起動
init();
calculateColorMixing();
