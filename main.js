var selectedIDs;
var json;

//Add a button on the toolbar
api('createToolbarButton', {
	icon: api('getRes', {file:'icon.svg'}),
	title:'PCB',
	fordoctype:'pcb,pcblib',
	menu:[
		{"text":"Track Width...", "cmd":"extension-tracewidth-show"},
	]
});

//subitems of Menu
api('createExtensionMenu', [
	{
		"text":"PCB",
		"fordoctype": "pcb,pcblib",
		submenu:[
			{"text":"Track Width...", "cmd":"extension-tracewidth-show"},
		]
	}
]);

// Command router
api('createCommand', {
	'extension-tracewidth-show' : function (){
		resetTrackWidth();
		calculateTrackWidth();
		selectedIDs = api('getSelectedIds').split(',');
		json = api('getSource', {type: "json"});
		
		if ( hasSelectedTracks() ) {
			$('#btnApplyTW').show();
		} else {
			$('#btnApplyTW').hide();
		}
		
		$dlgTraceWidth.dialog('open');
		Locale.update($dlgTraceWidth);
	},
});

var $dlgTraceWidth = api('createDialog', {
	title: "Track Width Calculator",
	content : '<div id="dlg-tracewidth-items" style="padding:10px"></div>'
			+'<div id="dlg-tracewidth-settings" style="padding:0 10px 10px;">'
			+ '<table cellspacing="1" cellpadding="0" style="margin-bottom:10px"><tbody>'
			
			+ '<tr><td style="text-align:right" class="i18n" i18n="Input Current:">Input Current:</td>'
			+ '<td><input type="text" class="form-input" maxlength="3" name="inputAmps" data-default="2" style="text-align:right;" />&nbsp;<strong>A</strong></td></tr>'
			
			+ '<tr><td style="text-align:right" class="i18n" i18n="Copper Thickness:">Copper Thickness:</td>'
			+ '<td><input type="text" class="form-input" maxlength="5" name="copperThickness" style="text-align:right" data-default="1.6" /></td>'
			+ '<td><select class="form-input" name="thicknessUnit"><option value="0.0035" selected>oz/ft^2</option><option value="2.54e-3">mil</option><option value="0.1">mm</option><option value="1e-4">um</option></select></td></tr>'

			+ '<tr><td style="text-align:right" class="i18n" i18n="Layer Type:">Layer Type:</td>'
			+ '<td><select class="form-input" name="layerType"><option value="e" selected>External layer in air</option><option value="i">Internal layer</option></select></td></tr>'
			
			+ '<tr><td colspan="3" style="padding-top:10px;padding-bottom:10px;font-weight:bold" class="i18n" i18n="Optional Parameters">Optional Parameters</td></tr>'
			
			+ '<tr><td style="text-align:right" class="i18n" i18n="Temperature Rise:">Temperature Rise:</td>'
			+ '<td><input type="text" class="form-input" maxlength="3" name="tempRise" style="text-align:right" data-default="10" /></td>'
			+ '<td><select name="tempRiseUnit"><option value="C" selected>&deg;C</option><option value="F">&deg;F</option></select></td></tr>'
			
			+ '<tr><td style="text-align:right" class="i18n" i18n="Ambient Temperature:">Ambient Temperature:</td>'
			+ '<td><input type="text" class="form-input" maxlength="3" name="ambTemp" style="text-align:right" data-default="25" /></td>'
			+ '<td><select name="ambTempUnit"><option value="C" selected>&deg;C</option><option value="F">&deg;F</option></select></td></tr>'

			+ '<tr><td style="text-align:right" class="i18n" i18n="Track Length:">Track Length:</td>'
			+ '<td><input type="text" class="form-input" maxlength="10" name="trackLength" style="text-align:right" data-default="3.302" /></td>'
			+ '<td><select name="trackLengthUnit"><option value="0.393701" selected>in.</option><option value="0.032808">ft.</option><option value="393.7008">mil</option><option value="10">mm</option><option value="10000">um</option><option value="1">cm</option><option value="0.01">m</option></select></td></tr>'

			+ '<tr><td colspan="3" style="padding-top:10px;padding-bottom:10px;font-weight:bold"><span id="trackWidthResultLabel">Results</span></td></tr>'
			
			+ '<tr><td style="text-align:right" class="i18n" i18n="Required Track Width:">Required Track Width:</td>'
			+ '<td><input type="text" class="form-input" name="trackWidth" id="reqTrackWidth" style="text-align:right" disabled /></td>'
			+ '<td><select name="trackWidthUnit"><option value="2.54e-3" selected>mil</option><option value="0.1">mm</option></select></td></tr>'
			
			+ '<tr><td style="text-align:right" class="i18n" i18n="Resistance:">Resistance:</td>'
			+ '<td><input type="text" class="form-input" name="resistance" style="text-align:right" disabled /></td>'
			+ '<td>Ohms</td></tr>'
			
			+ '<tr><td style="text-align:right" class="i18n" i18n="Voltage Drop:">Voltage Drop:</td>'
			+ '<td><input type="text" class="form-input" name="voltageDrop" style="text-align:right" disabled /></td>'
			+ '<td>V</td></tr>'
			
			+ '<tr><td style="text-align:right" class="i18n" i18n="Power Loss:">Power Loss:</td>'
			+ '<td><input type="text" class="form-input" name="powerLoss" style="text-align:right" disabled /></td>'
			+ '<td>W</td></tr>'
			
			+ '</tbody></table>'
			+ '<div style="width:90%;text-align:center"><a href="#" class="linkbutton" data-cmd="copyToClipboard" id="btnCopyTW">Copy</a>'
			+ '<a href="#" class="linkbutton" data-cmd="applyTrackWidth" id="btnApplyTW" alt="Apply calculated track width to selected tracks">Apply to Selected</a>'
			+ '</div>'
			+'</div>',
	width : 410,
	height : 500,
	modal : true,
	buttons : [{
			text : 'Close',
			cmd : 'dialog-close'
		}
	]
});

// Initialize everything
!(function (){
	
	$('#dlg-tracewidth-settings a.linkbutton').linkbutton().on('click',function(e) {
		var cmd = $(this).attr('data-cmd');
		if ( cmd && cmd.length ) {
			switch (cmd) {
				case 'calc':
					calculateTrackWidth();
					break;
				case 'copyToClipboard':
					copyTWToClipboard();
					break;
				case 'applyTrackWidth':
					// Apply the calculated track width to selected tracks
					var trackWidthUnit = $dlgTraceWidth.find('[name="trackWidthUnit"]').val();
					var trackWidth = parseFloat($dlgTraceWidth.find('[name="trackWidth"]').val());
					trackWidth = Number((trackWidth).toFixed(3));
					
					var convCall;
					var newWidth;
					
					if ( trackWidthUnit == "2.54e-3" ) {
						// mils
						// 1px = 10mil
						newWidth = trackWidth / 10;
					} else {
						// mm
						// 1px = 0.254mm
						newWidth = trackWidth / 0.254;
					}
					
					if ( selectedIDs.length ) {
						var i;
						
						for( i = 0; i < selectedIDs.length; i++) {
							tID = selectedIDs[i];
							if ( $.inArray(tID, json.TRACK) ) {
								json.TRACK[tID].strokeWidth = newWidth; 
							}
						}
						
						api('applySource', {source: json, createNew: false});
					}
					$dlgTraceWidth.dialog('close');
					break;
				default:
					break;
			}
		}
		
		Locale.update($('#dlg-tracewidth-setting-items'));
	});
	
	$('#dlg-tracewidth-settings input[type="text"]').on('keyup', function(e) {
		calculateTrackWidth();
	});
	
	$('#dlg-tracewidth-settings select').on('change', function(e) {
		calculateTrackWidth();
	});
	
	
	resetTrackWidth();
	
}());

function hasSelectedTracks() {
	
	if ( selectedIDs.length ) {
		var i;
		
		for( i = 0; i < selectedIDs.length; i++) {
			tID = selectedIDs[i];
			for(id in json.TRACK) {
				if (json.TRACK.hasOwnProperty(tID) )
					return true;
			}
		}
	}
	return false;
}


// 
function copyTWToClipboard() {
	$('#reqTrackWidth').removeAttr('disabled');
	var eltTrackWidth = document.getElementById('reqTrackWidth');
	
	eltTrackWidth.select();
	eltTrackWidth.setSelectionRange(0, 99999);
	
	document.execCommand('copy');
	eltTrackWidth.selectionEnd = eltTrackWidth.selectionStart;
	eltTrackWidth.blur();
	window.getSelection().removeAllRanges();
	$('#reqTrackWidth').attr('disabled', 'disabled');
	$('#btnCopyTW').focus();
	
	
}

function calculateTrackWidth() {
	var frm = $('#dlg-tracewidth-settings');
	
	var i = frm.find('[name="inputAmps"]').val();
	var tempRise = frm.find('[name="tempRise"]').val();
	var tempRiseUnit = frm.find('[name="tempRiseUnit"]').val();
	var copperThickness = frm.find('[name="copperThickness"]').val() * frm.find('[name="thicknessUnit"]').val();
	var ambTemp = frm.find('[name="ambTemp"]').val();
	var ambTempUnit = frm.find('[name="ambTempUnit"]').val();
	var trackLength = frm.find('[name="trackLength"]').val() / frm.find('[name="trackLengthUnit"]').val();
	var trackWidthUnit = frm.find('[name="trackWidthUnit"]').val();
	var layerType = frm.find('[name="layerType"]').val();
	var resultLabel = frm.find('#trackWidthResultLabel');
	
	if ( layerType == 'e' ) {
		resultLabel.html('Results for External Layer');
	} else if ( layerType == 'i' ) {
		resultLabel.html('Results for Internal Layer');
	}
	
	clearFormErrors(frm);
	
	if (!i || !i.length ) {
		hasError(frm.find('[name="inputAmps"]').first());
		return;
	}
	
	if ( tempRiseUnit == "F" ) {
		tempRise = tempRise * 5 / 9;
	}
	
	if ( ambTempUnit == "F" ) {
		ambTemp = (ambTemp - 32 ) * 5 / 9;
	}
	
	var eltTrackWidth = frm.find('[name="trackWidth"]');
	var eltTrackResistance = frm.find('[name="resistance"]');
	var eltTrackVoltageDrop = frm.find('[name="voltageDrop"]');
	var eltPowerLoss = frm.find('[name="powerLoss"]');
	
	// Perform the calculations
	var rho = 1.7e-6; // ohm-cm
	var alpha=3.9e-3; // ohm/ohm/C
	var areaInternal = A_internal(i, tempRise); // mils^2
	areaInternal = areaInternal * 2.54 * 2.54 / 1e6; //mil^2 to cm^2
	
	var widthInternal = areaInternal / copperThickness; //cm
	widthInternal = widthInternal / trackWidthUnit; //user units
	
	var tval = 1 * ambTemp + 1 * tempRise;
	
	var ri = (rho * trackLength / areaInternal) * (1 + alpha * ( tval - 25 ));
	var vi = ri * i;
	pi = i * i * ri;
	var areaExternal = A_external(i,tempRise); // mils^2
	
	areaExternal = areaExternal * 2.54 * 2.54 / 1e6; // mil^2 to cm^2
	
	var widthExternal = areaExternal / copperThickness;  // cm
	widthExternal = widthExternal / trackWidthUnit; //user units
	
	var re = (rho * trackLength / areaExternal) * (1 + alpha * ( tval - 25 ));
	var ve = re*i;
	var pe = i*i*re;
	
	if ( layerType == 'e' ) {
		eltTrackWidth.val( widthExternal.toPrecision(3) );
		eltTrackResistance.val( re.toPrecision(3) );
		eltTrackVoltageDrop.val( ve.toPrecision(3) );
		eltPowerLoss.val( pe.toPrecision(3) );
		
	} else if ( layerType == 'i' ) {
		eltTrackWidth.val( widthInternal.toPrecision(3) );
		eltTrackResistance.val( ri.toPrecision(3) );
		eltTrackVoltageDrop.val( vi.toPrecision(3) );
		eltPowerLoss.val( pi.toPrecision(3) );
	}
	
}

function hasError(elt) {
	elt.css({borderColor: 'red' });
}

function clearFormErrors(frmElt) {
	frmElt.find('.form-input').each(function(idx, elt) {
		$(elt).css({borderColor: "#d1d1d1"});
	});
}

function resetTrackWidth() {
	var frm = $('#dlg-tracewidth-settings');
	frm.find('input[type="text"]').each(function(idx, elt) {
		if ( $(elt).attr('data-default') ) {
			$(elt).val( $(elt).attr('data-default') );
		}
	});
}

// Gets the external current area
function A_external(current, rise) {
	var k = 0.048;
	var b = 0.44;
	var c = 0.725;
	return Math.pow((current/(k*Math.pow(rise,b))),1/c);
}

// Get the internal current area
function A_internal(current,rise) {
	var k = 0.024;
	var b = 0.44;
	var c = 0.725;
	return Math.pow((current/(k*Math.pow(rise,b))),1/c);
}