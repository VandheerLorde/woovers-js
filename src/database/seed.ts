import { hashSync } from 'bcrypt';
import { getDatabaseProvider } from './providers/get-provider';

const username = 'testusername123';
const plainPassword = 'testingpassword';
const hashedPassword = hashSync(plainPassword, 10);

try {
    const { provider, error } = getDatabaseProvider();

    let newUser = {
        username: username,
        password_hash: hashedPassword
    }

    if (error){
        console.log(error);
    }

    if (!error && provider) {
        provider.createUser(newUser);
        console.log('New user created!');
    }
} catch (err){
    console.log(err);
}