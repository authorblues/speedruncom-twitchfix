var $MENUENTRY;
var $MENUNUMBER;
var $EMBEDROW;
var $ICON = chrome.extension.getURL("icon/16.png");

var $BADREGEX = new RegExp("twitch.tv/(.+)/c/(.+)", "i");
var $GOODREGEX = new RegExp("twitch.tv/(.+)/v/(.+)", "i");

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
						$('#fixer-button').remove();
						if (!candidates.length) return;

						candidates.sort(function(a,b)
						{
							var adur = moment.duration(a.length, 'seconds');
							var bdur = moment.duration(b.length, 'seconds');

							var adiff = Math.abs(adur.subtract(runtime).asMilliseconds());
							var bdiff = Math.abs(bdur.subtract(runtime).asMilliseconds());
							return adiff - bdiff;
						});

						var selobj = $('<select>').attr('name', 'video');
						for (var i = 0; i < candidates.length; ++i)
							selobj.append($('<option>').attr('value', candidates[i].url).text(candidates[i].title));

						input.replaceWith(selobj);
						selobj.change();
					}),
					'json');
			},
			'jsonp');
		}
	});
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

$(document).on('change', 'select[name="video"]', function()
{
	if ($EMBEDROW) $EMBEDROW.remove();
	var row = $(this).closest('tr');

	var id = $(this).val().match($GOODREGEX)[2];
	var video = $('<iframe class="twitch" src="https://player.twitch.tv/?video=v'
		+ id + '&amp;autoplay=false" allowfullscreen=""></iframe>');

	$EMBEDROW = $('<tr>').append($('<td colspan="2">').append($('<div>').addClass('embed centered').append(video)));
	row.after($EMBEDROW);
})

function checkRows()
{
	addIconCounter(0);
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
	else nextRow(count, rest);
}

$(document).on('click', '.categoriesnav a', function()
{ addIconCounter(0); });

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
