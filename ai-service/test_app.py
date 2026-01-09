"""Minimal test Flask app"""
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/test1', methods=['GET'])
def test1():
    return jsonify({'message': 'test1 works'})

@app.route('/test2', methods=['GET'])
def test2():
    return jsonify({'message': 'test2 works'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=False)
