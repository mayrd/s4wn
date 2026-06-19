import urllib.request, json

with open('/opt/data/.env') as f:
    for line in f:
        if line.strip().startswith('GITHUB_TOKEN='):
            token = line.strip().split('=', 1)[1]
            break

url = 'https://api.github.com/repos/mayrd/s4wn/issues?state=open&per_page=50'
req = urllib.request.Request(url, headers={'Authorization': 'token {}'.format(token), 'Accept': 'application/vnd.github.v3+json'})
resp = urllib.request.urlopen(req)
issues = json.loads(resp.read())

for i in issues:
    labels = [l['name'] for l in i.get('labels', [])]
    print('#' + str(i['number']) + ' ' + i['title'] + ' | ' + str(labels))
    if i.get('body'):
        print('  ' + i['body'][:200])
    print()
