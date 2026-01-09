function popup(url) {
    window.open(url, "notice", "width=600,height=450,scrollbars=1");
}

function face(smile) {
    var bbscom = document.bbsform.comment.value;
    document.bbsform.comment.value = bbscom + smile;
}

// Case 1: Floating Form
function openFloatingForm(ownerName) {
    const bbs_cgi = './patio.cgi';

    // Create UI if not exists
    let container = document.getElementById('floating-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'floating-container';
        container.className = 'floating-container';
        container.innerHTML = `
            <div class="floating-header" id="floating-header">
                <span>お手紙を書いています: <span id="floating-target-name"></span></span>
                <div class="floating-close" onclick="closeFloatingForm()">×</div>
            </div>
            <div class="floating-body">
                <iframe id="floating-iframe" name="floating-iframe"></iframe>
            </div>
        `;
        document.body.appendChild(container);
        makeDraggable(container, document.getElementById('floating-header'));
    }

    const iframe = document.getElementById('floating-iframe');
    const targetLabel = document.getElementById('floating-target-name');
    targetLabel.innerText = ownerName + " さん";

    // Find owner thread
    fetch(`${bbs_cgi}?mode=find_owner&name=${encodeURIComponent(ownerName)}`)
        .then(response => response.text())
        .then(data => {
            if (data.startsWith('target_id:')) {
                const threadId = data.split(':')[1];
                iframe.src = `${bbs_cgi}?read=${threadId}&mode=form&view=mini#bbsform`;
                container.style.display = 'flex';
            } else {
                alert(ownerName + " さんの私書箱が見つかりませんでした。先にスレッドを作成していただく必要があるかもしれません。");
            }
        })
        .catch(err => {
            console.error('Error finding owner:', err);
            alert('検索中にエラーが発生しました。');
        });
}

function closeFloatingForm() {
    const container = document.getElementById('floating-container');
    if (container) {
        container.style.display = 'none';
        document.getElementById('floating-iframe').src = 'about:blank';
    }
}

function makeDraggable(el, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
        el.style.bottom = 'auto';
        el.style.right = 'auto';
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// ========================================
// 文通デスク機能（Correspondesk）
// ========================================

const DESK_STORAGE_KEY = 'letterBBS_correspondesk';

// デスクに置くボタンをクリック
function addToDesk(buttonElement) {
    console.log("[Debug] addToDesk called v3"); // Version check log

    // 親のpostコンテナから情報を取得
    const postElement = buttonElement.closest('.post');
    if (!postElement) {
        console.error("[Debug] Error: .post element not found");
        alert("エラー: 記事データが見つかりません");
        return;
    }

    // 投稿者名の取得（複数のパターンで試行）
    let targetName = "名無し";
    const authorBold = postElement.querySelector('.res-author b'); // パターン1: .res-author 内の bタグ
    const metaFlex = postElement.querySelector('.art-meta-flex');  // パターン2: 親コンテナ

    if (authorBold) {
        targetName = authorBold.innerText.trim();
        console.log("[Debug] Name found via .res-author b:", targetName);
    } else if (metaFlex) {
        // フォールバック: テキストノードなどから無理やり探す
        console.warn("[Debug] Warning: .res-author b not found. Trying fallback...");
        const rawText = metaFlex.innerText;
        const match = rawText.match(/^(.+?)\s*\(\d{4}\//); // 日付の前までを取得
        if (match && match[1]) {
            targetName = match[1].trim();
            console.log("[Debug] Name found via fallback regex:", targetName);
        }
    } else {
        console.error("[Debug] Error: Could not resolve targetName");
    }

    // 本文の取得
    const commentElement = postElement.querySelector('.comment');
    console.log("[Debug] commentElement:", commentElement);

    // 元のコメントを引用形式に整形
    let originalText = commentElement ? commentElement.innerText.trim() : "";
    console.log("[Debug] originalText length:", originalText.length);

    // 長すぎる場合は適度にカット（150文字程度）
    if (originalText.length > 150) {
        originalText = originalText.substring(0, 150) + "...";
    }

    // 引用記号を付与
    const formattedQuote = `> ${targetName}さんの発言:\n> ${originalText.replace(/\n/g, '\n> ')}\n\n`;
    console.log("[Debug] formattedQuote:", formattedQuote);

    const inputArea = postElement.querySelector('.desk-input-area');
    if (inputArea) {
        inputArea.style.display = 'block';
        const textarea = inputArea.querySelector('.desk-textarea');
        console.log("[Debug] textarea found. current value:", textarea.value);

        // 宛先情報を placeholder などでヒント出し（内部管理用）
        textarea.placeholder = `${targetName} さんへのお返事をここに...`;

        // 入力欄が空の場合のみ引用をセット
        if (!textarea.value) {
            textarea.value = formattedQuote;
            console.log("[Debug] Quote inserted successfully");
        } else {
            console.log("[Debug] Textarea is not empty. Skipping insert.");
        }

        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    } else {
        console.error("[Debug] Error: .desk-input-area not found");
    }
}

// 入力エリアを閉じる
function closeDeskInput(buttonElement) {
    const inputArea = buttonElement.closest('.desk-input-area');
    if (inputArea) {
        inputArea.style.display = 'none';
        inputArea.querySelector('.desk-subject').value = '';
        inputArea.querySelector('.desk-name').value = '';
        inputArea.querySelector('.desk-pwd').value = '';
        inputArea.querySelector('.desk-textarea').value = '';
    }
}

// お返事をlocalStorageに保存
function saveToDeskStorage(targetName, buttonElement) {
    const inputArea = buttonElement.closest('.desk-input-area');
    const subject = inputArea.querySelector('.desk-subject').value.trim();
    const name = inputArea.querySelector('.desk-name').value.trim();
    const pwd = inputArea.querySelector('.desk-pwd').value.trim();
    const textarea = inputArea.querySelector('.desk-textarea');
    const message = textarea.value.trim();

    if (!subject) {
        alert('件名を入力してください。');
        return;
    }
    if (!name) {
        alert('あなたの名前を入力してください。');
        return;
    }
    if (!pwd) {
        alert('パスワードを入力してください。');
        return;
    }
    if (!message) {
        alert('お返事の内容を入力してください。');
        return;
    }

    // 既存のストックを取得
    let deskItems = JSON.parse(localStorage.getItem(DESK_STORAGE_KEY) || '[]');

    // 同じ宛先が既にある場合は上書き
    const existingIndex = deskItems.findIndex(item => item.targetName === targetName);
    if (existingIndex >= 0) {
        deskItems[existingIndex].subject = subject;
        deskItems[existingIndex].name = name;
        deskItems[existingIndex].pwd = pwd;
        deskItems[existingIndex].message = message;
        deskItems[existingIndex].timestamp = new Date().toISOString();
    } else {
        deskItems.push({
            targetName: targetName,
            subject: subject,
            name: name,
            pwd: pwd,
            message: message,
            timestamp: new Date().toISOString()
        });
    }

    localStorage.setItem(DESK_STORAGE_KEY, JSON.stringify(deskItems));

    // 入力エリアを閉じる
    closeDeskInput(buttonElement);

    // デスクパネルを更新
    refreshDeskPanel();

    alert(`${targetName} さんへのお返事を文通デスクに保存しました！`);
}

// デスクパネルを更新
function refreshDeskPanel() {
    const deskItems = JSON.parse(localStorage.getItem(DESK_STORAGE_KEY) || '[]');
    const listContainer = document.getElementById('deskItemList');
    const emptyMsg = document.getElementById('deskEmptyMsg');

    if (deskItems.length === 0) {
        listContainer.innerHTML = '';
        emptyMsg.style.display = 'block';
        return;
    }

    emptyMsg.style.display = 'none';
    listContainer.innerHTML = deskItems.map((item, index) => `
        <div class="desk-item">
            <div class="desk-item-header">
                <div>
                    <strong>宛先: ${item.targetName}</strong>
                    <div class="desk-item-meta">件名: ${item.subject || '(未設定)'} / 投稿者: ${item.name || '(未設定)'}</div>
                </div>
                <button onclick="removeDeskItem(${index})" class="btn-remove-item">削除</button>
            </div>
            <div class="desk-item-message">${item.message.replace(/\n/g, '<br>')}</div>
            <div class="desk-item-footer">
                <small>${new Date(item.timestamp).toLocaleString('ja-JP')}</small>
            </div>
        </div>
    `).join('');
}

// 個別のアイテムを削除
function removeDeskItem(index) {
    let deskItems = JSON.parse(localStorage.getItem(DESK_STORAGE_KEY) || '[]');
    deskItems.splice(index, 1);
    localStorage.setItem(DESK_STORAGE_KEY, JSON.stringify(deskItems));
    refreshDeskPanel();
}

// 全てクリア
function clearAllDeskItems() {
    if (confirm('文通デスクの全てのお返事を削除しますか？')) {
        localStorage.removeItem(DESK_STORAGE_KEY);
        refreshDeskPanel();
    }
}

// デスクパネルの開閉
function toggleDeskPanel() {
    const panel = document.getElementById('correspondeskPanel');
    const content = panel.querySelector('.desk-content');
    const toggleBtn = panel.querySelector('.btn-toggle-desk');

    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggleBtn.textContent = '▼';
    } else {
        content.style.display = 'none';
        toggleBtn.textContent = '▲';
    }
}

// ページ読み込み時にデスクパネルを初期化
document.addEventListener('DOMContentLoaded', function () {
    const panel = document.getElementById('correspondeskPanel');
    if (panel) {
        refreshDeskPanel();
    }
});

// ========================================
// フェーズ2：一括自動送信機能
// ========================================

// 一括送信
async function sendAllDeskItems() {
    const deskItems = JSON.parse(localStorage.getItem(DESK_STORAGE_KEY) || '[]');

    if (deskItems.length === 0) {
        alert('送信するお返事がありません。');
        return;
    }

    if (!confirm(`${deskItems.length}件のお返事を一括送信しますか？`)) {
        return;
    }

    const bbs_cgi = './patio.cgi';
    const regist_cgi = './regist.cgi';
    let successCount = 0;
    let failedItems = [];

    // プログレス表示用
    const panel = document.getElementById('correspondeskPanel');
    const originalContent = panel.querySelector('.desk-content').innerHTML;
    panel.querySelector('.desk-content').innerHTML = '<div class="desk-progress">送信中...</div>';

    for (let i = 0; i < deskItems.length; i++) {
        const item = deskItems[i];
        panel.querySelector('.desk-progress').textContent = `送信中... (${i + 1}/${deskItems.length}) ${item.targetName}さんへ`;

        try {
            // 1. スレッドIDを検索
            const findResponse = await fetch(`${bbs_cgi}?mode=find_owner&name=${encodeURIComponent(item.targetName)}`);
            const findData = await findResponse.text();

            if (!findData.startsWith('target_id:')) {
                failedItems.push({ name: item.targetName, reason: '私書箱が見つかりませんでした' });
                continue;
            }

            const threadId = findData.split(':')[1];

            // 2. regist.cgiへPOST
            const formData = new FormData();
            formData.append('mode', 'regist');
            formData.append('res', threadId);  // 重要：返信モード
            formData.append('sub', item.subject);
            formData.append('name', item.name);
            formData.append('pwd', item.pwd);
            formData.append('comment', item.message);

            const postResponse = await fetch(regist_cgi, {
                method: 'POST',
                body: formData
            });

            if (postResponse.ok) {
                successCount++;
            } else {
                failedItems.push({ name: item.targetName, reason: '投稿に失敗しました' });
            }

            // サーバー負荷軽減のため少し待機
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            failedItems.push({ name: item.targetName, reason: 'エラー: ' + error.message });
        }
    }

    // 結果表示
    let resultMessage = `送信完了！\n成功: ${successCount}件`;
    if (failedItems.length > 0) {
        resultMessage += `\n失敗: ${failedItems.length}件\n\n`;
        resultMessage += failedItems.map(f => `・${f.name}: ${f.reason}`).join('\n');
    }

    alert(resultMessage);

    // 成功したものだけデスクから削除
    if (successCount > 0) {
        let remainingItems = [];
        for (let i = 0; i < deskItems.length; i++) {
            const item = deskItems[i];
            const failed = failedItems.find(f => f.name === item.targetName);
            if (failed) {
                remainingItems.push(item);
            }
        }
        localStorage.setItem(DESK_STORAGE_KEY, JSON.stringify(remainingItems));
    }

    // パネルを更新
    panel.querySelector('.desk-content').innerHTML = originalContent;
    refreshDeskPanel();
}
