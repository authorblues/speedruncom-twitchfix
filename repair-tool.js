var $MENUENTRY;
var $MENUNUMBER;
var $ICON = chrome.extension.getURL("icon/16.png");

var $BADREGEX = new RegExp("twitch.tv/(.+)/c/(.+)", "i")

$(document).ready(function()
{
	var $notif = $('#notificationmenu');

	$MENUENTRY = $('<li class="nav-button-dropdown">');
	$MENUENTRY.append($('<a>').append($('<img>').attr('src', $ICON).attr('alt', 'TwitchFix')));

	$notif.after($MENUENTRY);
	$MENUENTRY.click(checkRows);

	$('input[name="video"][type="text"]').each(function(x,i)
	{
		var match = $(this).val().match($BADREGEX);
		if (match)
		{
			var btn = $('<img>').attr('src', $ICON).attr('id', 'fixer-button').click(fixVideo);
			$(this).after($('<label>').append(btn));
		}
	});
});

function fixVideo(btn)
{
	$('input[name="video"][type="text"]').each(function(x,i)
	{
		var input = $(this);
		var match = input.val().match($BADREGEX);
		if (match)
		{
			var username = match[1];
			var target = $('#editrunform').attr('action').match("id=([a-z0-9]+)")[1];

			$.get('http://www.speedrun.com/api/v1/runs/' + target, function(data)
			{
				var rundate = moment(data.data.date);
				var runtime = moment.duration(data.data.times.primary_t, 'seconds');

				$.get('https://api.twitch.tv/kraken/channels/' + username + '/videos?limit=100',
					processTwitchVODs.bind(window, rundate, [], function(candidates)
					{
						candidates.sort(function(a,b)
						{
							var adur = moment.duration(a.length, 'seconds');
							var bdur = moment.duration(b.length, 'seconds');
							return Math.abs(adur.subtract(runtime).milliseconds()) - Math.abs(bdur.subtract(runtime).milliseconds());
						});

						var selobj = $('<select>').attr('name', 'video');
						for (var i = 0; i < candidates.length; ++i)
							selobj.append($('<option>').attr('value', candidates[i].url).text(candidates[i].title));
						input.replaceWith(selobj);
					}),
					'json');
			},
			'jsonp');
		}
	});
	$('#fixer-button').remove();
}

function processTwitchVODs(compare, candidates, callback, data)
{
	for (var i = 0; i < data.videos.length; ++i)
	{
		var voddate = moment(data.videos[i].recorded_at);
		if (Math.abs(voddate.diff(compare, 'days', true)) < 3)
			candidates.push(data.videos[i]);
	}

	if (data._links.next && data.videos.length) $.get(data._links.next,
		processTwitchVODs.bind(window, compare, candidates, callback), 'json');
	else callback(candidates);
}

function checkRows()
{
	$('.linked[data-target^="/run/"]').removeClass('twitchfix-broken');
	nextRow(0, $('.linked[data-target^="/run/"]').toArray());
}

function nextRow(count, rest)
{
	if (!rest.length) { addIconCounter(count); return; }

	var current = rest[0];
	var target = $(current).data('target');
	rest = rest.slice(1);

	if (target)
	{
		target = target.split('/')[2];
		$.get('http://www.speedrun.com/api/v1/runs/' + target, function(data)
		{
			var videos = getSafe(data, ['data', 'videos', 'links'], []);
			for (var i = 0; i < videos.length; ++i)
			{
				if (videos[i].uri.search($BADREGEX) != -1)
				{
					$(current).addClass('twitchfix-broken');
					addIconCounter(++count); break;
				}
			}

			nextRow(count, rest);
		},
		'jsonp');
	}
	else nextRow(count, rest)
}

function addIconCounter(x)
{
	if ($MENUNUMBER) $MENUNUMBER.remove();

	if (x)
	{
		$MENUNUMBER = $('<a>').append('<span class="menucounter">' + x + '</span>')
		$MENUENTRY.append($MENUNUMBER);
	}
}

function getSafe(obj, path, df)
{
	try
	{
		for (var i = 0; i < path.length; ++i)
			obj = obj[path[i]];
		return obj;
	}
	catch (e) { return df; }
}
