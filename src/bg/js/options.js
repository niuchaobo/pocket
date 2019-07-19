/* global odhback, localizeHtmlPage, utilAsync, optionsLoad, optionsSave */
async function populateAnkiDeckAndModel(options) {
    let names = [];
    $('#deckname').empty();
    names = await odhback().opt_getDeckNames();
    if (names !== null) {
        names.forEach(name => $('#deckname').append($('<option>', { value: name, text: name })));
    }
    $('#deckname').val(options.deckname);

    $('#typename').empty();
    names = await odhback().opt_getModelNames();
    if (names !== null) {
        names.forEach(name => $('#typename').append($('<option>', { value: name, text: name })));
    }
    $('#typename').val(options.typename);
}

async function populateAnkiFields(options) {
    const modelName = $('#typename').val() || options.typename;
    if (modelName === null) return;

    let names = await odhback().opt_getModelFieldNames(modelName);
    if (names == null) return;

    let fields = ['expression', 'reading', 'extrainfo', 'definition', 'definitions', 'sentence', 'url', 'audio'];
    fields.forEach(field => {
        $(`#${field}`).empty();
        $(`#${field}`).append($('<option>', { value: '', text: '' }));
        names.forEach(name => $(`#${field}`).append($('<option>', { value: name, text: name })));
        $(`#${field}`).val(options[field]);
    });
}

async function updateAnkiStatus(options) {
    $('#services-status').text(chrome.i18n.getMessage('msgConnecting'));
    $('#anki-options').hide();
    if (options.services == 'ankiweb')
        $('#user-options').show();
    else {
        $('#user-options').hide();
    }

    let version = await odhback().opt_getVersion();
    if (version === null) {
        $('#services-status').text(chrome.i18n.getMessage('msgFailed'));
    } else {
        populateAnkiDeckAndModel(options);
        populateAnkiFields(options);
        $('#services-status').text(chrome.i18n.getMessage('msgSuccess', [version]));
        $('#anki-options').show();
    }
}

function populateDictionary(dicts) {
    $('#dict').empty();
    dicts.forEach(item => $('#dict').append($('<option>', { value: item.objectname, text: item.displayname })));
}

function populateSysScriptsList(dictLibrary) {
    const optionscripts = Array.from(new Set(dictLibrary.split(',').filter(x => x).map(x => x.trim())));
    let systemscripts = [
        'builtin_encn_Collins', 'general_Makenotes',//default & builtin script
        'cncn_Zdic', //cn-cn dictionary
        'encn_Collins', 'encn_Cambridge', 'encn_Oxford', 'encn_Youdao', 'encn_Baicizhan', //en-cn dictionaries
        'enen_Collins', 'enen_LDOCE6MDX', 'enen_UrbanDict', //en-en dictionaries
        'enfr_Cambridge', 'enfr_Collins', //en-fr dictionaries
        'fren_Cambrige', 'fren_Collins', //fr-cn dictionaries
        'escn_Eudict', 'frcn_Eudict', 'frcn_Youdao', 'rucn_Qianyi' //msci dictionaries
    ];
    $('#scriptslistbody').empty();
    systemscripts.forEach(script => {
        let row = '';
        row += `<input class="sl-col sl-col-onoff" type="checkbox" ${optionscripts.includes(script) || optionscripts.includes('lib://'+script)?'checked':''}>`;
        row += `<input class="sl-col sl-col-cloud" type="checkbox" ${optionscripts.includes('lib://'+script)?'checked':''}>`;
        row += `<span class="sl-col sl-col-name">${script}</span>`;
        row += `<span class="sl-col sl-col-description">${chrome.i18n.getMessage(script)}</span>`;
        $('#scriptslistbody').append($(`<div class="sl-row">${row}</div>`));
    });

    $('.sl-col-onoff', '.sl-row:nth-child(1)').prop('checked', true); // make default script(first row) always active.
    $('.sl-col-cloud', '.sl-row:nth-child(1)').prop('checked', false); // make default script(first row) as local script.
    $('.sl-col-cloud, .sl-col-onoff', '.sl-row:nth-child(1)').css({ 'visibility': 'hidden' }); //make default sys script untouch
}

function onScriptListChange() {
    let dictLibrary = [];
    $('.sl-row').each(function() {
        if ($('.sl-col-onoff', this).prop('checked') == true)
            dictLibrary.push($('.sl-col-cloud', this).prop('checked') ? 'lib://' + $('.sl-col-name', this).text() : $('.sl-col-name', this).text());
    });
    $('#sysscripts').val(dictLibrary.join());
}

function onHiddenClicked() {
    $('.sl-col-cloud').toggleClass('hidden');
}

async function onAnkiTypeChanged(e) {
    if (e.originalEvent) {
        let options = await optionsLoad();
        populateAnkiFields(options);

    }
}

async function onLoginClicked(e) {
    if (e.originalEvent) {
        let options = await optionsLoad();
        options.id = $('#id').val();
        options.password = $('#password').val();

        $('#services-status').text(chrome.i18n.getMessage('msgConnecting'));
        await odhback().ankiweb.initConnection(options, true); // set param forceLogout = true

        let newOptions = await odhback().opt_optionsChanged(options);
        updateAnkiStatus(newOptions);
    }
}

async function onServicesChanged(e) {
    if (e.originalEvent) {
        let options = await optionsLoad();
        options.services = $('#services').val();
        let newOptions = await odhback().opt_optionsChanged(options);
        updateAnkiStatus(newOptions);
    }
}

async function onSaveClicked(e) {
    if (!e.originalEvent) return;

    let optionsOld = await optionsLoad();
    let options = $.extend(true, {}, optionsOld);

    options.enabled = $('#enabled').prop('checked');
    options.hotkey = $('#hotkey').val();

    //options.dictSelected = $('#dict').val();
    //options.monolingual = $('#monolingual').val();
    //options.preferredaudio = $('#anki-preferred-audio').val();
    //options.maxcontext = $('#maxcontext').val();
    //options.maxexample = $('#maxexample').val();

    //options.services = $('#services').val();
    //options.id = $('#id').val();
    //options.password = $('#password').val();

    let fields = ['deckname', 'typename', 'expression', 'reading', 'extrainfo', 'definition', 'definitions', 'sentence', 'url', 'audio'];
    fields.forEach(field => {
        options[field] = $(`#${field}`).val() == null ? options[field] : $(`#${field}`).val();
    });

    //options.sysscripts = $('#sysscripts').val();
    //options.udfscripts = $('#udfscripts').val();

    $('#gif-load').show();
    let newOptions = await odhback().opt_optionsChanged(options);
    $('.gif').hide();
    $('#gif-good').show(1000, () => { $('.gif').hide(); });

    populateDictionary(newOptions.dictNamelist);
    $('#dict').val(newOptions.dictSelected);

    if (e.target.id == 'saveclose')
        window.close();
}

function onCloseClicked(e) {
    window.close();
}

async function loginOut(e) {
    if (!e.originalEvent) return;
    $('#gif-load').show();
    let options = await optionsLoad();
    options.userkey='';
    options.qr_ticket='';
    options.headimage='';
    options.nickName='未登录';
    let newOptions = await odhback().opt_optionsChanged(options);
    $('.gif').hide();
    $('#gif-good').show(1000, () => { $('.gif').hide(); });
    $('#user_headimage')[0].src='/fg/img/cloud.png';
    $('#nick_name').text('未登录');
}

async function onReady() {
    localizeHtmlPage();
    let options = await optionsLoad();
    $('#enabled').prop('checked', options.enabled);
    $('#hotkey').val(options.hotkey);

    populateDictionary(options.dictNamelist);

    $('#user_headimage')[0].src=options.headimage;
    $('#nick_name').text(options.nickName);

    let fields = ['deckname', 'typename', 'expression', 'reading', 'extrainfo', 'definition', 'definitions', 'sentence', 'url', 'audio'];
    fields.forEach(field => {
        $(`#${field}`).val(options[field]);
    });

    //populateSysScriptsList(options.sysscripts);
    onHiddenClicked();

    $('#login').click(onLoginClicked);
    $('#loginOut').click(loginOut);
    $('#saveclose').click(onSaveClicked);
    $('#close').click(onCloseClicked);
    $('.gif').hide();

    $('.sl-col-onoff, .sl-col-cloud').click(onScriptListChange);
    $('#hidden').click(onHiddenClicked);
    $('#typename').change(onAnkiTypeChanged);
    $('#services').change(onServicesChanged);

    updateAnkiStatus(options);
}

$(document).ready(utilAsync(onReady));