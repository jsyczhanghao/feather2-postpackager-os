'use strict';

module.exports = function(ret, conf, setting){
	if(!setting.url){
		setting.url = '';
	}

	if(!setting.include){
		setting.include = [];
	}

	feather.util.map(ret.src, function(subpath, file){
		if(file.isHtmlLike && setting.include.indexOf(file.id) > -1){
			var loads = [];
			var arr = [];

			var content = file.getContent().replace(/<script src="([^"]+)"><\/script>|<link rel="stylesheet" href="([^"]+)"[^>]+\/>|<script data-os>([\s\S]*?)<\/script>/g, function(all, src, href, script){
				var load ;

				if(src){
					if(/\/feather/.test(src)){
						let f = ret.pkg['/static/feather.js'];
						return '<script>' + f.getContent() + '</script>';
					}else{
						load = {
							type: 'js',
							url: src
						};
					}
				}else if(href){
					load = {
						type: 'link',
						url: href
					};
				}else if(script){
					load = {
						type: 'script',
						content: script
					};
				}

				if(load){
					if(loads.length == 0 && arr.length == 0 && load.type == 'js' || load.type == 'link'){
						arr.push(load);
					}else{
						loads.push(arr.slice(0));
						arr = [load];
					}

					return '';
				}

				return all;
			});

			if(arr.length){
				loads.push(arr);
			}

			var ID = feather.util.md5(file.id, 32) + '.js';

			var f = feather.file.wrap(feather.project.getProjectPath() + '/static/l_/' + ID);
			f.useHash = false;
			f.setContent('require.config({map: {}, deps: {}});' + create());
			ret.pkg[f.subpath] = f;

			
			var C = 'require.config(\'deps\', {});var __ID__ = "'+ f.getUrl() +'", __URL__ = "' + setting.url + '" + __ID__; __URL__+= (__URL__.indexOf("?") > -1 ? "&" : "?") + "__random=" + Date.now();  require.async(__URL__);';

			if(content.indexOf('__OFFLINE__PLACEHOLDER__') > -1){
				content = content.replace('__OFFLINE__PLACEHOLDER__', C);
			}else{
				content = content.replace('</body>', '<script>' + C + '</script></body>');
			}

			file.setContent(content);

			function create(){
				var remote = false;
				var urls = loads.shift();

				if(!urls){
					return '';
				}

				urls = urls.map(function(load){
					if(load.type == 'link' || load.type == 'js'){
						remote = true;
					}

					if(load.url){
						return "'" + load.url + "'";
					}

					return load.content;
				});

				if(remote){
					return 'require.async([' + urls.join(',') + '], function(){ ' + create() + ' });';
				}else{
					return ';' + urls.join(';') + ';' + create();
				}
			}
		}
	});
};