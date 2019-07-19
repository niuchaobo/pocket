/* global odhback, localizeHtmlPage, utilAsync, optionsLoad, optionsSave */

function populateDictionary(dicts) {
    $('#dict').empty();
    dicts.forEach(item => $('#dict').append($('<option>', { value: item.objectname, text: item.displayname })));
}


async function onOptionChanged(e) {
    if (!e.originalEvent) return;

    let options = await optionsLoad();
    options.enabled = $('#enabled').prop('checked');
    options.hotkey = $('#hotkey').val();
    options.dictSelected = $('#dict').val();
    options.wxenabled = $("#wxenabled").prop('checked');
    let newOptions = await odhback().opt_optionsChanged(options);
    optionsSave(newOptions);
}



async function onWxOptionChanged(e) {
    if (!e.originalEvent) return;

    let options = await optionsLoad();
    options.wxenabled = $("#wxenabled").prop('checked');
    if(options.wxenabled){
        //获取ticket
        let wx_ticket='';
        let ticket = await getTicketFromBackend().then(value => {if(value!=null){
            wx_ticket=value['ticket']
        }});
        if(wx_ticket!=''){
            options.qr_ticket=wx_ticket;
            $("#qrcode img").attr("src","https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket="+wx_ticket);
            $("#qrcode").wxshow();

        }
    }else{
        $("#qrcode").wxhide();
    }
    let newOptions = await odhback().opt_optionsChanged(options);
    optionsSave(newOptions);
}


function onMoreOptions() {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('options.html'));
    }
}

function updateWxenabled(options) {
    options.wxenabled = $("#wxenabled").prop('checked');
    if(options.wxenabled){
        $("#qrcode").wxshow();
    }else{
        $("#qrcode").wxhide();
    }
}

async function adjustWxenabled(options){
    let userKey = options.userkey;
    if(userKey == ''){
        updateWxenabled(options);
        $("#wxenabled").change(onWxOptionChanged);
    }else{
        /*let userKeyDb = await getKeyFromDb();
        if(userKey == userKeyDb){
            $("#wxdiv").hide();
        }else{
            updateWxenabled(options);
            $("#wxenabled").change(onWxOptionChanged);
        }*/
        if(options.wxenabled){
            options.wxenabled=false;
            optionsSave(options);
        }
        $("#wxhead")[0].src=options.headimage;
        $("#wxhead").show();
        $("#wxdiv").hide();
    }
}

async function qrcodeListen(){
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;//浏览器兼容
    var config = {attributes: true}//配置对象
    $("#qrcode img").each(function(){
        var _this = $(this);
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(record) {
                if(record.type == "attributes"){//监听属性
                    let num = 0;
                    let interval = setInterval(async function () {
                        num++;
                        if(num>=30){
                            clearInterval(interval);
                            $("#ncb-shade-timeout img")[0].src=`${chrome.runtime.getURL('fg/img/timeout.png')}`;
                            $('#ncb-shade-timeout').show();
                        }
                        let img_src = _this[0].src;
                        //console.log(ticket);
                        if(img_src!=''){
                            let ticket = '';
                            var reg=/^http.*\?ticket=(.*)/;
                            if(reg.test(img_src)){
                                let res = img_src.match(reg);
                                ticket = res[1];
                            }
                            if(ticket!=''){
                                let user =await getKeyFromDb(ticket);
                                if(user!=null && user!=''){
                                    //let userObj = JSON.parse(user);
                                    let userKey = user['openid'];
                                    if(userKey!=''){
                                        let options =await optionsLoad();
                                        options.userkey = userKey;
                                        options.headimage = user['headimgurl'];
                                        options.nickName = user['nickname'];
                                        let newOptions = await odhback().opt_optionsChanged(options);
                                        optionsSave(newOptions);
                                        $("#wxhead")[0].src=options.headimage;
                                        $("#wxhead").show();
                                        $("#ncb-shade img")[0].src=`${chrome.runtime.getURL('fg/img/ok.png')}`;
                                        $("#ncb-shade").show();
                                        setTimeout(function () {
                                            $('#qrcode').hide();
                                        },2000);
                                        clearInterval(interval);
                                    }
                                }
                            }
                        }
                    },1000);
                }
            });
        });
        observer.observe(_this[0], config);
    });
}

async function popTranslate(e){
    //if (!e.originalEvent) return;
    let words = $("#searchWord").val();
    var result = await odhback().popTranslation(words);
    let notes = buildNote(result,words);
    let tdiv = renderDiv(notes);
    tdiv.then(value => fillResult(value));
    $('#odh-note1').hide();

}

function fillResult(value) {
    $(".crosspanel").html(value);
}



function buildNote(result,words) {
    let tmpl = {
        css: '',
        expression: words,
        reading: '',
        extrainfo: '',
        definitions: '',
        sentence:'',
        url: '',
        audios: [],
        reads: []
        //overview:'',
    };

    //if 'result' is array with notes.
    if (Array.isArray(result)) {
        for (const item of result) {
            for (const key in tmpl) {
                item[key] = item[key] ? item[key] : tmpl[key];
            }
        }
        return result;
    } else { // if 'result' is simple string, then return standard template.
        tmpl['definitions'] = [].concat(result);
        return [tmpl];
    }

}

async function renderDiv(notes) {
    let content = '';
    let services = this.options ? this.options.services : '';
    let image = '';
    let imageclass = '';

    for (const [nindex, note] of notes.entries()) {
        content += note.css + '<div class="odh-note'+nindex+'"' +'id=odh-note'+nindex+'>';
        //content += note.overview;
        let audiosegment = '';
        let audioArr = [];
        let audioImg = '';
        let likes = `<img title="收藏" src="${chrome.runtime.getURL('fg/img/likes.png')}"/>`;
        if (note.audios) {
            for (const [dindex, audio] of note.audios.entries()) {
                if (audio)
                    audioImg = `<img class="odh-playaudio" data-url="${audio}" data-nindex="${nindex}" data-dindex="${dindex}" src="${chrome.runtime.getURL('fg/img/play.png')}"/>`;
                    audioArr[dindex]=audioImg;
                    audiosegment += `${audioImg}`;
            }
        }
        if(nindex == 0){
            let read_uk = `${note.reads}`.length==0?'':`${note.reads[0]}`;
            let audio_uk = `${audioArr}`.length==0?'':`${audioArr[0]}`;
            let read_us = `${note.reads}`.length==0?'':`${note.reads[1]}`;
            let audio_us = `${audioArr}`.length==0?'':`${audioArr[1]}`;
            content += `
                <div class="odh-headsection">
                    <!--<span class="odh-audios">${audiosegment}</span>-->
                    <!--<span class="odh-expression">${note.expression}</span>-->
                    <span class="odh-reading">${read_uk}${audio_uk}</span>
                    <span class="odh-reading">${read_us}${audio_us}</span>
                    <span class="odh-extra">${note.extrainfo}</span>
                    <span class="odh-likes">${likes}</span>
                </div>`;
            content += `<div style="display: none" id="message"><img style="vertical-align:middle" width="15px" height="15px" src="${chrome.runtime.getURL('fg/img/likes.png')}" /><span class="message">test</span></div>`
        }else{
            content += `
                <div class="odh-headsection">
                    <!--<span class="odh-expression">${note.expression}</span>-->
                    <span class="odh-reading">${note.reading}</span>
                    <span class="odh-extra">${note.extrainfo}</span>
                </div>`;
        }
        for (const [dindex, definition] of note.definitions.entries()) {
            let button = (services == 'none' || services == '') ? '' : `<img ${imageclass} data-nindex="${nindex}" data-dindex="${dindex}" src="${chrome.runtime.getURL('fg/img/'+ image)}" />`;
            content += `<div class="odh-definition">${button}${definition}</div>`;
        }
        content += '</div>';
        if(nindex==0 && notes.length>1){
            content += '<div><span class="detail">点击展开柯林斯专业翻译</span></div>';
        }
    }
    //content += `<textarea id="odh-context" class="odh-sentence">${this.sentence}</textarea>`;
    //content += '<div id="odh-container" class="odh-sentence"></div>';
    return popupHeader() + content + popupFooter();
    //return content;
}

function popupHeader() {
    let root = chrome.runtime.getURL('/');
    return `
        <html lang="en">
            <head><meta charset="UTF-8"><title></title>
                <link rel="stylesheet" href="${root+'fg/css/frame.css'}">
                <link rel="stylesheet" href="${root+'fg/css/spell.css'}">
            </head>
            <body style="margin:0px;">
            <div class="odh-notes">`;
}

function popupFooter() {
    let root = chrome.runtime.getURL('/');
    let services = this.options ? this.options.services : '';
    let image = (services == 'ankiconnect') ? 'plus.png' : 'cloud.png';
    let button = chrome.runtime.getURL('fg/img/' + image);
    let monolingual = this.options ? (this.options.monolingual == '1' ? 1 : 0) : 0;

    return `
            </div>
            <div class="icons hidden"">
                <img id="plus" src="${button}"/>
                <img id="load" src="${root+'fg/img/load.gif'}"/>
                <img id="good" src="${root+'fg/img/good.png'}"/>
                <img id="fail" src="${root+'fg/img/fail.png'}"/>
                <img id="play" src="${root+'fg/img/play.png'}"/>
                <div id="context">${this.sentence}</div>
                <div id="monolingual">${monolingual}</div>
                </div>
            <!--<script src="${root+'fg/js/spell.js'}"></script>
            <script src="${root+'fg/js/frame.js'}"></script>-->
            </body>
        </html>`;
}

function spreadDetail(){
    if($('#odh-note1').is(':hidden')){
        $('#odh-note1').show();
        $('.detail').text('点击折叠柯林斯专业翻译');
    }else{
        $('#odh-note1').hide();
        $('.detail').text('点击展开柯林斯专业翻译');
    }
}

function playaudio(e){
    e.stopPropagation();
    e.preventDefault();
    let url = this.getAttribute('data-url');
    const audio = new Audio(url);
    audio.currentTime = 0;
    audio.play();
}


function messageShow(){
    $("#message").fadeIn(200,function () {
        $("#message").fadeOut(2000);
    });
}

function sendMessageToContentScript(message, callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
    {
        chrome.tabs.sendMessage(tabs[0].id, message, function(response)
        {
            if(callback) callback(response);
        });
    });
}


async function onReady() {
    localizeHtmlPage();
    let options = await optionsLoad();
    $('#enabled').prop('checked', options.enabled);
    $('#wxenabled').prop('checked', options.wxenabled);
    $('#hotkey').val(options.hotkey);
    $('#deckname').val(options.deckname);
    populateDictionary(options.dictNamelist);
    $('#dict').val(options.dictSelected);

    $('#enabled').change(onOptionChanged);
    $('#hotkey').change(onOptionChanged);
    $('#deckname').change(onOptionChanged);
    $('#dict').change(onOptionChanged);
    $('#more').click(onMoreOptions);
    adjustWxenabled(options);

    $('.anki-options').hide();
    $("#search").click(popTranslate);
    $('.crosspanel').on('click','.detail',spreadDetail);

    $('input:text:first').focus();
    $(document).keydown(function(event){
        if(event.keyCode == 13){
            $("#search").click();
            event.preventDefault();
            event.stopPropagation();
        }
    });
    $('.crosspanel').on('click','.odh-playaudio',playaudio);
    $('.crosspanel').on('click','.odh-likes',addfavourite);


    qrcodeListen();
    if(options.wxenabled){
        let wx_ticket='';
        let ticket = await getTicketFromBackend().then(value => {if(value!=null){
            wx_ticket=value['ticket']
        }});
        if(wx_ticket!=''){
            $("#qrcode img").attr("src","https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket="+wx_ticket);
        }
    }

    //$("#wxhead").click(loginOut);

    //updateAnkiStatus(options);

}



$(document).ready(utilAsync(onReady));