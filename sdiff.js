function sDiff(originalString, modifiedString, options) {

    this.originalString = originalString;
    this.modifiedString = modifiedString;
    this.x = '';
    this.y = '';
    this.prefix = [];
    this.suffix = [];
    this.hasDiff = false;
    this.converter = document.createElement('textarea');

    this.setOptions(options);
}

sDiff.prototype.setOptions = function(options) {

    var x = this.originalString;
    var y = this.modifiedString;

    var defaultTags = {
        del: '<del>{ part }</del>',
        ins: '<ins>{ part }</ins>',
        keep: '<span>{ part }</span>'
    };

    var defaultOptions = {
        delimiters: [ ' ', '\n' ],
        condensed: true,
        tags: defaultTags,
        replacements: [],
        decodeHtmlEntities: true,
        noDiffMessage: 'The texts are identical!'
    };

    options = (typeof options !== 'undefined') 
        ? options
        : defaultOptions;

    this.options = (typeof this.options !== 'undefined')
        ? this.options
        : options;

    [ 'delimiters', 'condensed', 'replacements', 'decodeHtmlEntities', 'noDiffMessage' ].forEach(function(prop) {
        if (typeof options[prop] !== 'undefined') {
            this.options[prop] = options[prop];
        }

        if (typeof this.options[prop] === 'undefined') {
            this.options[prop] = defaultOptions[prop];
        }
    }.bind(this));

    if (typeof this.options.tags === 'undefined' && typeof options.tags === 'undefined') {
        this.options.tags = defaultTags;
    }

    if (typeof options.tags !== 'undefined') {
        [ 'del', 'ins', 'keep' ].forEach(function(tag) {
            this.options.tags[tag] = typeof options.tags[tag] !== 'undefined' 
                ? options.tags[tag]
                : this.options.tags[tag];
        }.bind(this));
    }

    // prepare diff: split into the desired parts
    // (if no delimiters are given -> character based comparison)
    if (this.options.delimiters.length > 0) {
        x = this.getWords(this.originalString, this.options.delimiters);
        y = this.getWords(this.modifiedString, this.options.delimiters);
    }

    // extract prefix and suffix to reduce the costs of calculating the diff
    this.prefix = this.getPrefix(x, y);
    x = x.slice(this.prefix.length, x.length);
    y = y.slice(this.prefix.length, y.length);

    this.suffix = this.getSuffix(x, y);
    this.x = x.slice(0, x.length - this.suffix.length);
    this.y = y.slice(0, y.length - this.suffix.length);
}

sDiff.prototype.getOptions = function() {
    return this.options;
}

sDiff.prototype.getWords = function(string, delimiters) {

    var words = []; 
    var word = '';

    if (typeof delimiters === 'undefined') {
        delimiters = this.options.wordDelimiters;
    }

    for (var i = 0; i < string.length; i++) {
        var char = string[i];

        word += char;

        if (delimiters.indexOf(char) > -1) {

            if (char !== '\n') {
                words.push(word);
                word = '';
            }
            else {
                words.push(word.substr(0, word.length - 1));
                word = '\n';
            }
        }
    }

    if (word.length > 0) {
        words.push(word);
    }

    return words;
}

sDiff.prototype.getPrefix = function (x, y) {
    var i = 0;
    var prefix = [];
    var iMax = Math.min(x.length, y.length);

    while(x[i] === y[i] && i < iMax) {
        prefix.push(x[i]);
        i++;
    }

    return prefix;
}

sDiff.prototype.getSuffix = function (x, y) {
    var i = 0;
    var xLen = x.length - 1;
    var yLen = y.length - 1;
    var iMax = Math.min(xLen, yLen);
    var suffix = [];

    while(x[xLen - i] === y[yLen - i] && i < iMax) {
        suffix.push(x[xLen - i]);
        i++;
    }

    return suffix.reverse();
}

sDiff.prototype.getLcsMatrix = function() {
    var x = this.x;
    var y = this.y;

    var m = [];
    var i, j;

    for (i = 0; i <= x.length; i++) {
        m[i] = [];
        m[i][0] = 0;
    }

    for (j = 0; j <= y.length; j++) {
        m[0][j] = 0;
    }

    for (i = 1; i <= x.length; i++) {
        for (j = 1; j <= y.length; j++) {
            if (x[i-1] == y[j-1]) {
                m[i][j] = m[i-1][j-1] + 1;
            }
            else {
                m[i][j] = Math.max(m[i][j-1], m[i-1][j]);
            }
        }
    }
    
    return m;
}

sDiff.prototype.getRawDiff = function(lcsMatrix, i, j, diffs) {
    var x = this.x;
    var y = this.y;

    lcsMatrix = (typeof lcsMatrix !== 'undefined') ? lcsMatrix : this.getLcsMatrix(x, y);
    i = (typeof i !== 'undefined') ? i : x.length;
    j = (typeof j !== 'undefined') ? j : y.length;
    diffs = (typeof diffs !== 'undefined') ? diffs : [];

    if (i > 0 && j > 0 && x[i-1] == y[j-1]) {
        diffs.push({ action: 'keep', text: x[i-1] });
        return this.getRawDiff(lcsMatrix, i-1, j-1, diffs);
    }
    else if (j > 0 && (i == 0 || lcsMatrix[i][j-1] >= lcsMatrix[i-1][j])) {
        diffs.push({ action: 'ins', text: y[j-1] });
        return this.getRawDiff(lcsMatrix, i, j-1, diffs);
    }
    else if (i > 0 && (j == 0 || lcsMatrix[i][j-1] < lcsMatrix[i-1][j])) {
        diffs.push({ action: 'del', text: x[i-1] });
        return this.getRawDiff(lcsMatrix, i-1, j, diffs);
    }
    
    return diffs.reverse();
}

sDiff.prototype.getDiff = function() {
    var diffs = [];
    var rawDiff = this.getRawDiff();
    var i = 0;

    this.hasDiff = false;

    while(i < rawDiff.length) {
        if (rawDiff[i].action !== 'keep') {
            this.hasDiff = true;
            break;
        }
    }

    this.prefix.forEach(function(word) {
        diffs.push({ action: 'keep', text: word });
    });

    diffs = diffs.concat(rawDiff);

    this.suffix.forEach(function(word) {
        diffs.push({ action: 'keep', text: word });
    });

    if (!this.options.condensed) {
        return diffs;
    }

    if (diffs.length === 0) {
        return [];
    }

    var compressedDiffs = [];
    var component = { action: diffs[0].action, text: diffs[0].text };

    for (var n = 1; n < diffs.length; n++) {

        var current = diffs[n];

        if (current.action === component.action) {
            component.text += current.text;
        }
        else {
            compressedDiffs.push({ action: component.action, text: component.text });
            component = { action: current.action, text: current.text };
        }
    }

    compressedDiffs.push({ action: component.action, text: component.text });

    return compressedDiffs;
}

sDiff.prototype.render = function() {

    var renderedDiff = '';

    this.getDiff().forEach(function(part) {
        var text = part.text;

        if (part.action !== 'keep') {
            this.options.replacements.forEach(function(replacement) {
                if (typeof replacement.only === 'undefined' || replacement.only === part.action) {
                    text = text.split(replacement.search).join(replacement.replacement);
                }
            });
        }

        if (this.options.decodeHtmlEntities) {
            this.converter.innerText = text;
            text = this.converter.innerHTML;
        }

        renderedDiff += this.options.tags[part.action].replace('{ part }', text);
    }.bind(this));

    return (this.options.noDiffMessage !== false && !this.hasDiff)
        ? this.options.noDiffMessage
        : renderedDiff;
}