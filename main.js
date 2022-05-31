require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const github = require('@actions/github');
const { writeFileSync } = require('fs');

async function run() {
  try {
    const { token } = process.env;
    const octokit = new Octokit({ auth: `token ${token}` });
    const username = github.context.repo.owner;

    async function queryFollowers(page = 1) {
      let { data: followers } = await octokit.users.listFollowersForUser({
        username,
        per_page: 100,
        page,
      });
      if (followers.length >= 100) {
        followers = followers.concat(await queryFollowers(page + 1));
      }
      return followers;
    }

    async function queryFollowing(page = 1) {
      let { data: following } = await octokit.users.listFollowingForUser({
        username,
        per_page: 100,
        page,
      });
      if (following.length >= 100) {
        following = following.concat(await queryFollowing(page + 1));
      }
      return following;
    }

    const { data: user } = await octokit.users.getByUsername({
      username,
    });

    const followers = await queryFollowers();
    followers.reverse();
    const following = await queryFollowing();

    const before = `# 列出所有关注者和关注者

轻松查看和过滤所有关注和关注。通过 GitHub Action 自动更新。

- 由于GitHub默认的follows和following不支持分页和过滤
- 如果您有任何问题，请打开一个新问题 [issue]

`;

    function dealBlog(blog) {
      if (blog) {
        return `[${blog}](https://${blog})`;
      }
      return '-';
    }

    const middle = `## ${username}

<img src="${user.avatar_url}" width="120" />

| Name | Blog | Location |
| -- | -- | -- | -- | -- |
| ${user.name || '-' } | [webVueBlog](https://github.com/webVueBlog) | ${user.location || '-' } |

## Followers <kbd>${followers.length}</kbd>

<table>
  ${formatTable(followers)}
</table>

## Following <kbd>${following.length}</kbd>

<table>
  ${formatTable(following)}
</table>

`
    const end = `## LICENSE

[MIT](https://github.com/webVueBlog/nice-my-friend/blob/master/LICENSE)

Copyright (c) 2022 我是哪吒 [webVueBlog](https://github.com/webVueBlog)

`
    writeFileSync('./README.md', before + middle + end);
    console.log('Done!')
  } catch (error) {
    console.log(error.message);
  }
}

function formatTable(arr) {
  if (arr.length === 0) {
    return '';
  }
  let result = '';
  let row = arr.length / 5;
  const lastNo = arr.length % 5;
  if (lastNo != 0) row += 1;
  for (let j = 1; j <= row; j += 1) {
    let data = '';
    data = `<tr>
    <td width="150" align="center">${getUser(arr[(j-1)*5])}
    </td>
    <td width="150" align="center">${getUser(arr[(j-1)*5+1])}
    </td>
    <td width="150" align="center">${getUser(arr[(j-1)*5+2])}
    </td>
    <td width="150" align="center">${getUser(arr[(j-1)*5+3])}
    </td>
    <td width="150" align="center">${getUser(arr[(j-1)*5+4])}
    </td>
  </tr>`;
    result += data;
  }
  return result;
}

function getUser(user) {
  return user ?  `
      <a href="${user.html_url}">
        <img src="${user.avatar_url}" width="50" />
        <br />
        ${user.login}
      </a>` : '';
}

function getCompany(c) {
  if (c) {
    c = c.replace('@', '');
    return `[@${c}](https://github.com/${c})`;
  }
  return `-`;
}


run();
