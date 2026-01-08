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
