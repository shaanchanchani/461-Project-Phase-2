import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const requestData = {
            User: {
                name: username,
                isAdmin: username === 'admin'
            },
            Secret: {
                password: password
            }
        };

        console.log('Sending request:', requestData);

        try {
            const response = await fetch('https://3000-01jdswgvp5v0yssm5cv98hhykt.cloudspaces.litng.ai/authenticate', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            console.log('Response status:', response.status);
            const responseText = await response.text();
            console.log('Response text:', responseText);

            if (response.ok) {
                try {
                    const token = responseText.startsWith('"') ? JSON.parse(responseText) : responseText;
                    localStorage.setItem('authToken', token);
                    navigate('/');
                } catch (parseError) {
                    console.error('Error parsing token:', parseError);
                    setError('Invalid server response format');
                }
            } else {
                try {
                    const errorData = JSON.parse(responseText);
                    setError(errorData.error || 'Login failed');
                } catch (parseError) {
                    console.error('Error parsing error response:', parseError);
                    setError('Login failed: ' + responseText);
                }
            }
        } catch (error) {
            console.error('Network error:', error);
            setError('Failed to connect to the server. Please check if the backend is running.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                    <CardDescription>Enter your credentials to continue</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && (
                            <div className="text-red-500 text-sm">{error}</div>
                        )}
                        <Button type="submit" className="w-full">
                            Login
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
